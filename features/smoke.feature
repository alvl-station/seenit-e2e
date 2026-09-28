Feature: Core smoke — login, search, movie modal
  The original gate the deploy chain runs first. Read-only (REQ T-4).

  Scenario: The page served is the build that was just deployed
    # The deploy stamps <meta name="seenit-build" content="ref@sha"> into
    # the page and hands the same stamp to the smoke run (DEPLOY_STAMP).
    # The workflow already waited for the CDN to serve it; this asserts the
    # browser under test got that build too, so a green run can never be
    # a verdict on the previous release. Skipped when no stamp was given
    # (a run by hand, or an older deploy.yml).
    Then the served page carries the deployed build stamp

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

  # Search is a page of its own (2026-09-24): films and series together.
  Scenario: The search page says when it finds nothing, and closing returns to the shelf
    When I search for "qzxjkvbqzxjkvbqzxjkvb"
    Then the search page says nothing was found
    When I close the search page
    Then the catalog shows at least one movie

  Scenario: The search page opens from its tab and closes on the same tab
    When I open the search page
    Then the search page is open and asks for a query
    When I close the search page
    Then the search page is closed
    And the catalog shows at least one movie

  # «Додати» moved into the search (2026-09-29): three places to look, lent
  # to the strip, and the words carried from one to the next.
  Scenario: The search offers the app, outside the app and a screenshot
    When I search for "Дюна"
    Then the strip offers the three places to look
    When I look outside the app
    Then the search looks outside the app for "Дюна"
    When I look in a screenshot
    Then a screenshot can be chosen
    When I look in the app
    Then the search page shows results for "Дюна"

  # One person, one spelling in the titles; the Ukrainian one comes from the
  # people store. Both spellings must find the same films and series.
  Scenario: A person is found under either spelling, films and series together
    When I search for "Taron Egerton"
    Then the search page shows films and series
    When I remember the search results
    And I search for "Тарон Еджертон"
    Then the search page shows the same results

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
