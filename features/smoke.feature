Feature: Core smoke — login, search, movie modal
  The original gate the deploy chain runs first. Read-only (REQ T-4).

  Scenario: Logging in loads the catalog
    Then the catalog shows at least one movie
    # Strengthened alongside the account feature: the header must expose the
    # account entry point, or everything behind it is unreachable.
    And the account panel entry point is visible
    And the recommendations entry point is visible

  Scenario: Search narrows the catalog and clearing restores it
    When I search for "qzxjkvbqzxjkvbqzxjkvb"
    Then I see the empty state "Нічого не знайдено"
    When I clear the search
    Then the catalog shows at least one movie

  Scenario: Opening and closing the movie modal
    When I open the first card
    Then the modal is open with a non-empty title
    When I close the modal
    Then the modal is closed
