QUnit tests found in tests.html

Features So Far:
    - Add tasks to your todo list
    - Search-while-you-type avoids creating duplicate tasks
    - Mark tasks as prerequisites of each other to hide un-doable tasks
    - Mark tasks as done, and keep a history of things you've done

Next Steps:
    - Mark task as dropped
    - Button to unmark a prerequisite
    - Back button / history in detail panel
    - Start testing UI features with watir
    - Database switching (call it 'scopes', like work, personal, etc)
        - so I can keep my real todos in one database, and fiddle around with another
    - Solve hard syncing problems
    


Strategy for implementing synchronization:

Server must keep track of the state of every agent that ever tries to synchronize with it.  Therefore, every client should generate a uuid to identify itself, and store this value indefinitely.  Clients must also be aware of their dirty state.

The server must then keep track of what patches need to be applied to each agent.  Agents can work offline for long 
periods, so this information can never be deleted.  Hm...

What to do about agents that were only ever used once, and never touched again?  They could accumulate pending events forever.

Could keep track of a list of patches in order of the date they arrived on the server.  Then agent states are lightweight: they can be implemented as simply a timestamp index into this event log.  The patches may actually contain information much older than their sync date, but that's ok: those details will be handled by the clients when they receive their patches.  To sync, all you must do is grab all patches newer than the last time you synced.  Before doing this, you should emit your current dirty state as a patch.



Item dirty state must be stored as a patch of some sort.  If an item is modified on one machine, a patch should be sent out including only the fields of that item that were modified, and a textual diff of the note field.  This diff should be optimized for small amounts of text, like in mobwrite.  A 'last_modified' field might help win ties, perhaps.
    - how should I represent dirty state?

- How can you know if a prerequisite relationship that was added in one patch was also added and then removed at a later date on another agent?  May have to only soft-delete these relationships, and work with last_modified in them as well.

- What to do if two todo items have different ids but the same text?  Merge them.
Until merging is available, the duplicate todo text anomaly should be tolerated since it would be very rare unless users intentionally caused it.


Merging todo items should be made into a standard feature eventually.
    - design UI for this

How to merge fields:
    note: concatenate both notes
    created_date: use the oldest
    due_date: use the soonest (oldest)
    start_date: use the soonest (oldest)
    done_date: use the newest

