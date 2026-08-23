Feature: Recommendations flow — friends, mine, and the SeenIt collections
  One overlay, three sources. "Від друзів" is an honest placeholder until
  subscriptions exist; "Мої" gathers the films marked "рекомендую"; the
  SeenIt collections are auto-generated top-100 lists rebuilt weekly.

  Read-only: browsing only, nothing here adds or marks a film.

  Scenario: The flow opens with all three sources and is honest about friends
    When I open the recommendations flow
    Then the recommendations flow is open
    And the recommendation sources are "Від друзів", "Мої" and "Добірки SeenIt"
    When I switch the recommendations source to "friends"
    Then the recommendations body mentions subscriptions being planned
    When I close the recommendations flow
    Then the recommendations flow is closed

  Scenario: The SeenIt collections offer genre top-100s with real content
    When I open the recommendations flow
    Then at least 5 collection chips are shown
    When I open the collection "Топ-100 комедій"
    Then the collection grid shows between 1 and 100 films
