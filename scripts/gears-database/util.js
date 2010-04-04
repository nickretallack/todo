function iso_date_now(){
    return parse_date('now')
}

function parse_date(string){
    var date = Date.parse(string)
    if (date) return date.toISOString()
    else return null
}

function parse_time_utc(string){
    var date = Date.parse(string)
    if (date) {
        function f(n) {
            return n < 10 ? '0' + n : n;
        }

        return '' +
            f(date.getUTCHours())     + ':' +
            f(date.getUTCMinutes())   + ':' +
            f(date.getUTCSeconds())   + 'Z';
    } else return null
}

// On second thought, maybe we shouldn't use GMT time of days.  They don't make sense
function parse_time(string){
    var date = Date.parse(string)
    if (date) {
        function f(n) {
            return n < 10 ? '0' + n : n;
        }

        return [f(date.getHours()), f(date.getMinutes()), f(date.getSeconds())].join(':');
    } else return null
}

// function equals_pairs(object){
//     // var quoted_values = db.quote(_.values(object)) // might optimize by quoting in bulk
//     return _.map(object, function(value, key){
//         return key + '=' + db.quote(value)
//     }).join(', ')
// }
