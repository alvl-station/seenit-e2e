Feature: The collections page — top, friends, mine and the SeenIt lists
  One page, four sources. "Від друзів" lists the people followed, or says
  where to find one; "Мої" holds the account's own lists; "SeenIt" the
  shared ones. Read-only: browsing only.

  Scenario: The page opens with its four sources, and the friends source is never empty
    When I open the recommendations flow
    Then the recommendations flow is open
    And the recommendation sources are "Топ", "Від друзів", "Мої" and "SeenIt"
    When I switch the recommendations source to "friends"
    Then the friends source lists people or says where to find them
    When I close the recommendations flow
    Then the recommendations flow is closed

  Scenario: A collection opens AS the catalog, under the state plate
    When I open the recommendations flow
    And I switch the recommendations source to "seenit"
    Then at least 5 collections are listed
    When I open the first listed collection
    Then the state plate reads that collection's name
    And the catalog shows between 1 and 100 films
    When I close the state plate
    Then the state plate is gone
    And the recommendations flow is open
    When I close the recommendations flow
    Then the catalog shows at least one movie

  Scenario: «Створити» opens the new collection window over the page, not behind it
    # Regressed 2026-09-17: the window sat at a sheet's z-index under the
    # collections page, so only its last buttons showed below the page.
    # Opened and closed only — no collection is ever created here.
    When I open the recommendations flow
    And I press «Створити» on the collections page
    Then the new collection name field is visible and nothing covers it
    When I close the new collection window
    Then the new collection window is closed
    And the recommendations flow is open
