@marks
Feature: Marking a film watched or recommended
  These scenarios write, into the test account's own lists only; the
  catalogue stays shared, so adding or deleting a film stays forbidden.
  Every scenario removes its own mark again, by title: a watched film
  leaves the default shelf at once, so "the first card" is another film
  right after.

  The counts are read the way the account screen counts them; the archive
  («Архів» in the strip) is where a marked film is listed, and its three
  words («Усі», «Рекомендую», «Обовʼязково») narrow it.

  ONE account, ONE file, ONE worker. Every scenario that writes a mark or
  compares a count against the films listed lives here, and nowhere else:
  the @marks tag puts this file in its own Playwright project, which runs
  alone before the read-only projects start (playwright.config.js). Two of
  these running side by side made their counts race — one scenario's
  toggle landing between another's "remember" and "compare" reads — and
  a count scenario in another file raced the same way against a mark
  being set here. A new scenario that marks, or counts, goes in this file.

  Scenario: Marking a film watched raises the count and keeps it reachable
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    Then the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    Then that title is listed
    And that film is shown as watched
    When I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: The heart turns the eye on — recommending also marks watched
    Given I remember the "Рекомендую" count
    And I remember the "Дивився" count
    When I toggle "рекомендую" on the first card
    Then the "Рекомендую" count is one higher than remembered
    And the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    And I narrow the archive to "Рекомендую"
    Then that title is listed
    And that film is shown as watched
    When I toggle "рекомендую" on that film
    Then the "Рекомендую" count is back to what I remembered
    And the "Дивився" count is still one higher than remembered
    When I narrow the archive to "Усі"
    And I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: The archive lists exactly what the watched count claims
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    And I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists
    When I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: A mark survives a page reload
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    And I reload the catalog
    Then the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    And I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  # Moved from toggles.feature (2026-09-27): these read the counts, so they
  # race any mark being set in parallel and belong in the serial project.
  Scenario: The "Дивився" count matches the films the archive lists
    When I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists

  Scenario: The "Рекомендую" count matches the films the archive lists under it
    When I isolate the catalog to watched films
    And I narrow the archive to "Рекомендую"
    Then the "Рекомендую" tab count matches the films it lists
