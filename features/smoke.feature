Feature: Core smoke — login, search, movie modal
  The original gate the deploy chain runs first. Read-only (REQ T-4).

  Scenario: Logging in loads the catalog
    Then the catalog shows at least one movie
    # Strengthened alongside the account feature: the header must expose the
    # account entry point, or everything behind it is unreachable.
    And the account panel entry point is visible
    And the recommendations entry point is visible
    # Strengthened after the move to D1: the catalogue arrives in pages and
    # every page re-lays the grid, so a card's position is meaningless until
    # loading stops. Scenarios that find a card and then act on it by index
    # were asserting against a film that had moved out from under them.
    And the catalogue has stopped arriving

  Scenario: Search narrows the catalog and clearing restores it
    When I search for "qzxjkvbqzxjkvbqzxjkvb"
    Then I see the empty state "Нічого не знайдено"
    When I clear the search
    Then the catalog shows at least one movie

  Scenario: Opening and closing the movie modal
    When I open the first card
    Then the modal is open with a non-empty title
    # Strengthened alongside "Де подивитись": the trailer embed took over this
    # slot from the poster and shipped with no smoke cover at all. Exactly one
    # of the two must be there — neither means a blank panel, both means they
    # are fighting over the slot — and an embed must stay muted, since it
    # starts playing on its own.
    And the modal shows either an autoplaying trailer or a poster
    When I close the modal
    Then the modal is closed
