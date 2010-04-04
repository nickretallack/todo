QUnit tests found in tests.html

Features So Far:
    - Add tasks to your todo list
    - Search-while-you-type avoids creating duplicate tasks
    - Mark tasks as prerequisites of each other to hide un-doable tasks
    - Filter out tasks you can't do until a particular date, or at a particular time of day
    - Mark tasks as done or dropped, and keep a diary
    - Back up your data in JSON format

Features To Be:
    - Edit your lists offline on any computer, and synchronize when you're online
    - Upvote tasks every few hours to remind yourself just how much you wanted to do them
    - Filter out tasks you can't do without specific equipment
    - Filter out tasks you can't do within a radius of your current location
    - Add tasks to laundry lists, so you can keep doing them until you know them by heart



Next Steps:
    - NodeJS and Postgres
        - authenticate users
            - basic username+password will do
            - no openid implementation is available.
                - besides, openid is complicated.
        - receive the messages and store them
        - read user's messages after a given timestamp (or all messages if none given)

    - inserting the value false comes out as 'false'.  Weird.
    - start doing functional testing with selenium

    - Back button / history in detail panel
    - implement item ids as fragment identifiers you can jump between
        - how do I catch the back browser event to a fragment id?
        http://www.hunlock.com/blogs/Mastering_The_Back_Button_With_Javascript
    - Button to unmark a prerequisite

    - other relationships
    	- alternatives
    		- "Instead, I could..."
    		- when you complete it, marks alternative tasks as "completed alternative"
    	- bonus tasks
    		- "While I'm at it, I should..."
    		- automatically pulls in items at the same location

    - equipment

    - add up/down vote buttons
    	- only one vote per day, but you can change it.
    	- shit, how should it know which way you voted when it reloads the page?  Needs to know last vote direction and date.
    		- or maybe there are no downvotes


    - Start testing UI features with watir
    - Build a syncing server
    - Add database constraints
    - Database switching (call it 'scopes', like work, personal, etc)
        - so I can keep my real todos in one database, and fiddle around with another
        - implement scope names and settings in localstorage, so they're available regardless of what database is currently open.
    
    
More things to do:
    - Build a chatbot to post tasks to it
        - after server sync is completed

    - put in a time for it to trigger a reminder.
        - default reminder X minutes before due date?

    - this program could also make a great diary.  Make sure it's possible to edit notes once tasks are over, and then display the tasks and notes in chronological order.

    - consider making most database save methods use keyword arguments.  Item especially.
        - or just introduce a save_item_details that does it, and returns a full item with its new id
    - give mark_item_done a default second parameter of "completed"

    - add laundry lists in the right panel when no events are focused
        - add a 'close' button to focused event to unfocus it

    - if something has a due date, its prerequisites should be promoted based on how soon that date is.  That is, the closer due date ones should sort higher.  In this way, prerequisites must inherit the due date of their post-requisites, but only in a soft way.  Perhaps use a cached field for this in a later schema revision.

    - mark as laundry list item
    	- these should not show up in the main list
    	- add a column to item?
    	- these items can't really be completed forever.  They're more like habits to train yourself to do.
    - hmm, what if you wanted it to define a group for all the todos you've recently entered?

    - bulk add todos
    	- post to server
    	- paste in box, line by line

    - another kind of filtering is time of day.  add this later


    - test in other browsers:
    	- punch in the radio button in the main list when you click an autocomplete item

    - print out pretty todo lists
    - 'neglected' item list - unfinished tasks that haven't been touched in a while
    - recognize urls like rmilk does, but include the domain in the text with a ...
    - detect looping prerequisites
    - include a tree view

    - after going through a filters step, you can save/update/merge it as a perspective, to conveniently view later
    - make some tasks public so other people can vote on them
    - add a "convince yourself" field

    - put search in a background worker if it gets too slow
    - pluggable storage backends (gears, localStorage, cookies, memory)

    - Make radio buttons get selected properly
        - should it react to the one you have selected, or change it for you?
        - how should things get selected if they became visible again after changing prerequisites?

    - Consider using jsbundle
        http://bitbucket.org/DeadWisdom/jsbundle/wiki/Home



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

