function iso_date_now(){
    return parse_date('now')
}

function is_iso_date(string){
   return /^(\d{4})\D?(0[1-9]|1[0-2])\D?([12]\d|0[1-9]|3[01])(\D?([01]\d|2[0-3])\D?([0-5]\d)\D?([0-5]\d)?\D?(\d{3})?([zZ]|([\+-])([01]\d|2[0-3])\D?([0-5]\d)?)?)?$/.test(string)
}


function parse_date(string){
    // Short circuit because date.js can't parse iso format
    if (is_iso_date(string)) 
        return string

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
