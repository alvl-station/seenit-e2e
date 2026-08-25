Feature: Recommendations flow — friends, mine, and the SeenIt collections
  One overlay, three sources. "Від друзів" is an honest placeholder until
  subscriptions exist; "Мої" gathers the films marked "рекомендую"; the
  SeenIt collections are auto-generated top-100 lists rebuilt weekly.

  Read-only: browsing only, nothing here adds or marks a film.

  # Subscriptions shipped, so the tab stopped apologising for them. What has
  # to stay true is the other half of the old promise: with nobody followed
  # yet it must still say where people are FOUND, instead of showing an empty
  # panel that reads as broken.
  Scenario: The flow opens with all three sources and points at where people are found
    When I open the recommendations flow
    Then the recommendations flow is open
    And the recommendation sources are "Від друзів", "Мої" and "SeenIt"
    When I switch the recommendations source to "friends"
    Then the recommendations body points at where a person is found
    When I close the recommendations flow
    Then the recommendations flow is closed

  Scenario: A collection opens AS the catalog, under the state plate
    # «Відкрити як каталог» (interface-book redesign): a chip closes the
    # overlay and narrows the MAIN screen to the collection's films, with
    # the blood plate on top and its exit restoring the whole catalogue.
    When I open the recommendations flow
    Then at least 5 collection chips are shown
    When I open the collection "Топ-100 комедій"
    Then the state plate reads "Топ-100 комедій"
    And the catalog shows between 1 and 100 films
    When I close the state plate
    Then the state plate is gone
    And the catalog shows at least one movie
