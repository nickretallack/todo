// Voting Todos:
// test it
// add it to sort order

var delay_between_votes = "5 hours";

function vote_on_item(id){
    var keys = {id:id}
    var item = db.smart_get('item', keys);
    if (can_vote_on(item)){
        db_patch_update('item', keys, 
                {vote_count:item.vote_count+1, last_vote_date:iso_date_now()})
        return true
    }
    else return false
}

function can_vote_on(item){
    if (!item.last_vote_date)
        return true
    else {
        var vote_interval_ago = parse_date('-'+delay_between_votes)
        return item.last_vote_date < vote_interval_ago;
    }
}

