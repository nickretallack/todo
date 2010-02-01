// Wrap google.gears.factory to extend the database API.
// Found here: http://code.google.com/p/gears/issues/detail?id=111
// Locally modified.
(function() {
  function _db(innerDb) {
    this.innerDb_ = innerDb;
    this.nesting_ = 0;
    this.rollback_ = 0;

    // Replicate the 1.0 interface.
    this.lastInsertRowId = null;
    this.open = function(name) {
      return this.innerDb_.open(name);
    }
    this.execute = function(sqlStatement, argArray) {
      var ret = this.innerDb_.execute(sqlStatement, argArray);
      this.lastInsertRowId = this.innerDb_.lastInsertRowId;
      return ret;
    }
    this.close = function() {
      return this.innerDb_.close();
    }
    this.remove = function() {
      return this.innerDb_.remove();
    }

    /**
     * Return a quoted form of the passed value, suitable for use in
     * constructing an SQL statement.
     *
     * @param v A string or array of strings to quote.
     * @return A quoted string or array of quoted strings.
     */
    this.quote = function(v) {
      if (typeof(v) == 'string') {
        return this.selectSingle('select quote(?)', [v]);
      } else {
        var r = [];
        var n;
        while ((n = v.shift())) {
          r.push(this.selectSingle('select quote(?)', [n]));
        }
        return r;
      }
    }

    /**
     * Execute the query as execute(), closing the result set and
     * returning the number of rows changed.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return Number of rows modified.
     * @type Integer
     */
    this.run= function(sqlStatement, argArray) {
      this.execute(sqlStatement, argArray).close();
      /* TODO(shess) Unfortunately, we can't return the number of rows
       * modified at this level.
       */
      return 0;
    }

    /**
     * Execute the query as execute() with the array returned from
     * fn() as arguments.  Exits when fn() returns null.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Function} fn Function generating a sequence of arrays.
     * @return Number of rows modified.
     * @type Integer
     */
    this.doForEach = function(sqlStatement, fn) {
      var input;
      var ret = 0;
      while ((input = fn.call(null))) {
        ret += this.run(sqlStatement, input);
      }
      return ret;
    }

    /**
     * Execute the query as execute() with each array in argArrayArray
     * as arguments.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} argArrayArray Array of argument arrays.
     * @return Number of rows modified.
     * @type Integer
     */
    this.doArray = function(sqlStatement, argArrayArray) {
      var myArrayArray = argArrayArray.slice();
      return this.doForEach(sqlStatement, function() {
        return myArrayArray.shift();
      });
    }

    /**
     * Call fn() within a transaction, passing the database handle as
     * argument.  If fn() returns successfully, commit the transaction
     * and return the value fn() returned.  If fn() throws an
     * exception, rollback and rethrow.
     *
     * Now with Fabulous Fake Nested Transactions!  You can call
     * db.transaction() within a call to db.transaction().  If
     * everything goes through to completion, the outermost call will
     * commit things.  If any inner call rolls back, the outermost
     * call rolls back everything (that's why it's called "fake").
     *
     * @param {Function} fn Function to execute within the transaction.
     * @return Return value of fn().
     */
    this.transaction = function(fn) {
      var ret;
      if (this.nesting_ == 0) {
        this.run('BEGIN');
        this.rollback_ = 0;     // Just to be safe.
      }
      try {
        ++this.nesting_;
        ret = fn.call(null, this);
        if (this.nesting_ == 1) {
          if (this.rollback_) {
            this.run('ROLLBACK');
          } else {
            this.run('COMMIT');
          }
        }
      } catch(e) {
        if (this.nesting_ == 1) {
          this.run('ROLLBACK');
        }
        this.rollback_ = 1;
        throw e;
      } finally {
        if (!--this.nesting_) {
          this.rollback_ = 0;
        }
      }
      return ret;
    }

    /**
     * Forces containing db.transaction() calls to rollback.
     */
    this.rollback = function() {
      if (this.nesting_) {
        this.rollback_ = 1;
      }
    }

    /**
     * Execute sqlStatement with argArray using execute(), and return
     * the value of the first field of the first row.  Return null
     * if there are no rows.  Throws an exception if there is more
     * than one row or more than one fields.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return Value of first field of first row.
     */
    this.selectSingle = function(sqlStatement, argArray) {
      var rs = this.execute(sqlStatement, argArray);
      var ret;
      try {
        if (rs.fieldCount() != 1) {
          throw("selectSingle() requires exactly one field");
        }
        if (!rs.isValidRow()) {
          ret = null;
        } else {
          ret = rs.field(0);
          rs.next();
          if (rs.isValidRow()) {
            throw("selectSingle() requires one or zero rows");
          }
        }
      } finally {
        rs.close();
      }
      return ret;
    }

    /**
     * Execute sqlStatement with argArray using execute(), and return
     * an array of the first fields of each resulting row.  Return
     * empty array if there are no rows.  Throws an exception if there
     * is more than one field.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return Array of the first fields of each row.
     */
    this.selectColumn = function(sqlStatement, argArray) {
      var rs = this.execute(sqlStatement, argArray);
      var ret = [];
      try {
        if (rs.fieldCount() != 1) {
          throw("selectColumn() requires exactly one field");
        }
        while (rs.isValidRow()) {
          ret.push(rs.field(0));
          rs.next();
        }
      } finally {
        rs.close();
      }
      return ret;
    }

    /**
     * Execute sqlStatement with argArray using execute(), and return
     * a map from field names to field values for the first row of the
     * results.  Returns null if there are no rows.  Throws an
     * exception if there is more than one row.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return Map of field names to field values.
     */
    this.selectRow = function(sqlStatement, argArray) {
      var rs = this.execute(sqlStatement, argArray);
      var ret = {};
      try {
        if (rs.isValidRow()) {
          var cols = rs.fieldCount();
          for (var i = 0; i < cols; i++) {
            ret[rs.fieldName(i)] = rs.field(i);
          }
          rs.next();
          if (rs.isValidRow()) {
            throw("selectRow() requires one or zero rows");
          }
        } else {
          return null;
        }
      } finally {
        rs.close();
      }
      return ret;
    }

    /**
     * Execute sqlStatement with argArray using execute(), calling
     * resultFn() with a rowMap for each row of results.  Returns an
     * array of the return values from resultFn().
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @param {Function} resultFn Function to call with each row of results.
     * @return Results from each call to resultFn().
     * @type Array
     */
    this.select = function(sqlStatement, argArray, resultFn) {
      var rs = this.execute(sqlStatement, argArray);
      var ret = [];
      try {
        var cols = rs.fieldCount();
        var colNames = [];
        for (var i = 0; i < cols; i++) {
          colNames.push(rs.fieldName(i));
        }

        var rowMap;
        while (rs.isValidRow()) {
          rowMap = {};
          for (var i = 0; i < cols; i++) {
            rowMap[colNames[i]] = rs.field(i);
          }
          ret.push(resultFn.call(null, rowMap));
          rs.next();
        }
      } finally {
        rs.close();
      }
      return ret;
    }

    /**
     * Execute sqlStatement with argArray using execute(), returning
     * an array of rowMaps.
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return rowMap for each row of results.
     * @type Array
     */
    this.selectAll = function(sqlStatement, argArray) {
      return this.select(sqlStatement, argArray, function(rowMap) {
        return rowMap;
      });
    }

    /**
     * Execute sqlStatement with argArray using execute(), returning
     * an array of arrays.  Result is appropriate as input to
     * doArray().
     *
     * @param {String} sqlStatement The SQL statement to execute.
     * @param {Array} args Query bind parameters.
     * @return array for each row of results.
     * @type Array
     */
    this.selectAllAsArrays = function(sqlStatement, argArray) {
      var rs = this.execute(sqlStatement, argArray);
      var ret = [];
      try {
        var cols = rs.fieldCount();
        var rowArray;
        while (rs.isValidRow()) {
          rowArray = [];
          for (var i = 0; i < cols; i++) {
            rowArray.push(rs.field(i));
          }
          ret.push(rowArray);
          rs.next();
        }
      } finally {
        rs.close();
      }
      return ret;
    }

      /** My own additions **/
      /* TODO: Dependent on underscore.js.  remove that */
  
      /**
       * Insert an object into a table, matching the keys and values 
       */
  
      this.insert_query = function(table, data){
          var keys = _.keys(data).join(', ')
          var values = _.values(data)
          var qmarks = _.map(values, function(){ return '?' }).join(',')
          return {text:'insert into '+table+' ('+keys+') values ('+qmarks+')', params:values}
      }

      this.insert = function(table, data){
          var query = this.insert_query(table, data)
          db.run(query.text, query.params)
      }
  
      this.get_version = function(){
          try {
              return db.selectSingle('select version from schema_version order by version desc')
          } catch(err) {
              return 0
          }
      }
      
      this.set_version = function(version){
          db.insert('schema_version', {'version':version})
          this.version = version
      }
      
  
  
  
      /** End of my additions **/
    }

  
  /**
   * Wrap the passed Gears factory in a new factory object which
   * intercepts the version 1.0ext Database API.
   *
   * @param {Object} innerFactory The real factory.
   * @return A factory wrapper.
   * @type Object
   */
  function _factory(innerFactory) {
    this.innerFactory_ = innerFactory;
    this.create = function(className, version) {
      if (className == "beta.database" && version == "1.0ext") {
        var db = this.innerFactory_.create(className, "1.0");
        return db ? new _db(db) : db;
      }
      return this.innerFactory_.create(className, version);
    };
    this.getBuildInfo = function() {
      return this.innerFactory_.getBuildInfo();
    };
  }

  var new_factory = new _factory(google.gears.factory);
  google.gears = {factory: new_factory};
})();
