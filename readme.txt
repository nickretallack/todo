QUnit tests found in tests.html

Features So Far:
    - Add tasks to your todo list
    - Search-while-you-type avoids creating duplicate tasks
    - Mark tasks as prerequisites of each other to hide un-doable tasks
    - Mark tasks as done, and keep a history of things you've done

Next Steps:
    - Display a summary when items are marked done, asking what to do about any prerequisites
    - Mark task as dropped
    - Button to unmark a prerequisite
    - Back button / history in detail panel
    - Database switching (call it 'scopes', like work, personal, etc)
        - so I can keep my real todos in one database, and fiddle around with another
    - Solve hard syncing problems
        - how do I know what data I receive from others is new?
            - Could implement it like an event stream.  All events that I don't already have should be accepted.
            - Catalog all events ever received, so I know which ones to apply
            - Any way to avoid sending all events every time I sync?
    - Start testing UI features with webrat