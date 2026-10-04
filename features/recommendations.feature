Feature: The collections page — top, friends, mine and the SeenIt lists
  One page, four sources under one key on the page itself (owner's design, 2026-10-04): "Друзі" lists
  the collections of the people followed, or says where to find one; "Мої" holds the account's own
  collections and, in its corner, the trash and «Нова добірка»; "SeenIt" the shared ones.
  Read-only: browsing, opening and closing only.

  Scenario: The page opens with its four sources, and the friends source is never empty
    When I open the recommendations flow
    Then the recommendations flow is open
    And the recommendation sources are: "Топ, Друзі, Мої, SeenIt"
    When I switch the recommendations source to "friends"
    Then the friends source lists collections or says where to find them
    When I open the trash from «Мої»
    Then the trash lists what was removed or says it is empty
    When I close the recommendations flow
    Then the recommendations flow is closed

  Scenario: A collection opens AS the catalog, under its own head
    When I open the recommendations flow
    And I switch the recommendations source to "seenit"
    Then at least 5 collections are listed
    When I open the first listed collection
    Then the collection's head reads that collection's name
    And the catalog shows between 1 and 100 films
    When I go back from the collection
    Then the collection's head is gone
    And the recommendations flow is open
    When I close the recommendations flow
    Then the catalog shows at least one movie

  Scenario: The header's switch draws the collections as rows, shelves or tiles
    When I open the recommendations flow
    And I switch the recommendations source to "seenit"
    And I draw the collections as "list"
    Then the collections are drawn as "list"
    When I draw the collections as "rail"
    Then the collections are drawn as "rail"
    When I draw the collections as "cards"
    Then the collections are drawn as "cards"

  Scenario: «Нова добірка» opens the new collection window over the page, not behind it
    # Regressed 2026-09-17: the window sat at a sheet's z-index under the
    # collections page, so only its last buttons showed below the page.
    # Opened and closed only — no collection is ever created here.
    When I open the recommendations flow
    And I switch the recommendations source to "mine"
    And I press «Нова добірка» on the collections page
    Then the new collection name field is visible and nothing covers it
    When I close the new collection window
    Then the new collection window is closed
    And the recommendations flow is open

  Scenario: Sharing a collection of mine shows its QR code and its card
    When I open the recommendations flow
    And I switch the recommendations source to "mine"
    And I open the first listed collection
    And I press «Поділитися» on the collection
    Then the share window shows a QR code and the collection's name
    When I close the share window
    Then the share window is closed
