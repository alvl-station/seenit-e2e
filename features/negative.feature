Feature: Negative paths — what a person sees when something finds nothing
  Every scenario here checks that a dead end EXPLAINS itself. A blank panel
  reads as "the app broke" rather than "no matches", and that distinction is
  invisible to any test that only asserts "no results were shown".
  Read-only throughout (REQ T-4): searching and opening modals never writes.

  Scenario: A search matching nothing says so
    When I search for "qzxjkvbqzxjkvbqzxjkvb"
    Then the search page says nothing was found

  Scenario: Whitespace is not treated as a search
    When I search for "   "
    Then the search page is open and asks for a query

  Scenario: Leaving a dead-end search restores the catalog
    When I search for "qzxjkvbqzxjkvbqzxjkvb"
    And I close the search page
    Then the catalog shows at least one movie
    And no empty state is shown

  Scenario: Adding a title that finds nothing on TMDb reports it
    When I open the add modal
    And I search there for "qzxjkvbqzxjkvbqzxjkvb"
    Then the add modal reports that nothing was found
    When I close the add modal
    Then background scroll is unlocked
