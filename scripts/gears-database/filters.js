// TODO: does this query work without the []?
function get_all_items(){
    return db.selectAll("select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid \
    order by \
    (case when due_date is null then 1 else 0 end), due_date, \
    vote_count desc, \
    (case when done_date is null then 0 else 1 end), done_date desc, \
    created_date desc")
}

// TODO: lifo / fifo sorting
function get_goal_items(){
    // What does it mean to be a goal?
    // Well, it means you have zero post-requisites.  Is the unfinished part necessary?  I dunno.
    return db.selectAll("select item.id, item_text.text, item.done_reason \
        from item join item_text on item.rowid = item_text.rowid \
        where item.done_date is null \
        and 0 = ( \
            select count(*) from prerequisite join item as after_item \
            on prerequisite.after_item_id = after_item.id \
            where prerequisite.before_item_id = item.id \
            and after_item.done_date is null) \
        ")
}

function get_available_items(){
    // An item is available if it is not done, and has no unfinished prerequisites
    // Other factors to incorporate: start date
    // It doesn't matter if a completed task has prerequisites
    return db.selectAll("select item.id, item_text.text, item.done_reason \
        from item join item_text on item.rowid = item_text.rowid \
        where item.done_date is null \
        and 0 = ( \
            select count(*) from prerequisite join item as before_item \
            on prerequisite.before_item_id = before_item.id \
            where prerequisite.after_item_id = item.id \
            and before_item.done_date is null \
        ) \
        and (item.start_date < date('now') or item.start_date is null) \
        \
        and ( \
               (start_time is null and end_time is null) \
            or (end_time is null and time('now', 'localtime') > start_time) \
            or (start_time is null and time('now', 'localtime') < end_time) \
            or (start_time is not null and end_time is not null \
                and ( \
                    ( start_time < end_time \
                        and start_time < time('now', 'localtime') \
                        and end_time > time('now', 'localtime')) \
                    or ( start_time > end_time \
                     and start_time < time('now', 'localtime') \
                     or end_time > time('now', 'localtime')) \
                ) \
            ) \
        ) \
        \
        order by \
        (case when due_date is null then 1 else 0 end), due_date,\
        vote_count desc, created_date asc")
}

// (end > start and start < 7 and end > 7) or (start > end and (7 > start or 7 < end));

function get_unfinished_items(){
    return db.selectAll("select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is null \
    order by \
    (case when due_date is null then 1 else 0 end), due_date,\
    vote_count desc, created_date desc")
}

function get_finished_items(){
    return db.selectAll("select item.id, item_text.text, item.done_reason \
    from item join item_text on item.rowid = item_text.rowid \
    where item.done_date is not null \
    order by done_date desc")
}
