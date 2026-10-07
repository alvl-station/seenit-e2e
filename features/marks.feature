@marks
Feature: Marking a film by its score
  A film is marked by the score given in its card (owner's ask,
  2026-09-20): the shelf's cards carry no eye and no heart any more. The
  meter under the card's tabs sets a number from 1.0 to 10.0, «Оцінити»
  saves it, and the marks follow from it: any score means watched, 6.0 and
  up also «Рекомендую», 8.0 and up also «Обовʼязково». «Прибрати оцінку»
  (until 2026-10-07 «Не дивився») takes the number and the marks off again.

  These scenarios write, into the test account's own lists only; the
  catalogue stays shared, so adding or deleting a film stays forbidden.
  Every scenario clears its own score with «Прибрати оцінку», and the ctx
  fixture clears it as well if a step fails first. The film is followed
  by its key: a scored film leaves the default shelf at once, so "the
  first film" is another film right after.

  The counts are read the way the account screen counts them; the archive
  is the account's «Статистика» since 2026-10-03: its figures
  («переглянуто», «рекомендую», «обовʼязково»…) are buttons, and the films
  of the one pressed are listed under them.

  ONE account, ONE file, ONE worker. Every scenario that writes a mark or
  compares a count against the films listed lives here, and nowhere else:
  the @marks tag puts this file in its own Playwright project, which runs
  alone before the read-only projects start (playwright.config.js). Two of
  these running side by side made their counts race — one scenario's
  mark landing between another's "remember" and "compare" reads — and a
  count scenario in another file raced the same way against a mark being
  set here. A new scenario that marks, or counts, goes in this file.

  Scenario: Scoring a film marks it watched, and removing the score takes it back
    Given I remember the "Дивився" count
    When I give the first film a score of "5.0"
    Then the card shows the score "5.0"
    And the "Дивився" count is one higher than remembered
    When I close the modal
    And I isolate the catalog to watched films
    Then that title is listed
    And that film is shown as watched
    When I open that film's card from the shelf
    Then the card shows the score "5.0"
    When I say I have not seen it
    Then the card shows no score
    And the "Дивився" count is back to what I remembered

  Scenario: A recommending score also marks watched, and a lower one keeps only watched
    Given I remember the "Рекомендую" count
    And I remember the "Дивився" count
    When I give the first film a score of "7.0"
    Then the meter lights the "Рекомендую" badge
    And the "Рекомендую" count is one higher than remembered
    And the "Дивився" count is one higher than remembered
    When I close the modal
    And I isolate the catalog to watched films
    And I narrow the archive to "Рекомендую"
    Then that title is listed
    And that film is shown as watched
    When I open that film's card from the shelf
    And I give that film a score of "5.0"
    Then the "Рекомендую" count is back to what I remembered
    And the "Дивився" count is still one higher than remembered
    When I say I have not seen it
    Then the "Дивився" count is back to what I remembered
    When I close the modal
    Then that title is not listed

  Scenario: The archive lists exactly what the watched count claims
    Given I remember the "Дивився" count
    When I give the first film a score of "5.0"
    And I close the modal
    And I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists
    When I open that film's card from the shelf
    And I say I have not seen it
    Then the "Дивився" count is back to what I remembered

  Scenario: A score, and taking it off, both survive a page reload
    Given I remember the "Дивився" count
    When I give the first film a score of "5.0"
    And I reload the catalog
    Then the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    And I open that film's card from the shelf
    Then the card shows the score "5.0"
    When I say I have not seen it
    And I reload the catalog
    Then the "Дивився" count is back to what I remembered

  # Moved from toggles.feature (2026-09-27): these read the counts, so they
  # race any mark being set in parallel and belong in the serial project.
  Scenario: The "Дивився" count matches the films the archive lists
    # The film it counts is scored here, and cleared by the teardown (owner's ask, 2026-10-06: tests make their data).
    When I give the first film a score of "8.0"
    And I close the modal
    And I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists

  Scenario: The "Рекомендую" count matches the films the archive lists under it
    When I give the first film a score of "8.0"
    And I close the modal
    And I isolate the catalog to watched films
    And I narrow the archive to "Рекомендую"
    Then the "Рекомендую" tab count matches the films it lists

  Scenario: The archive is the account's statistics, one list at a time
    # Moved from toggles.feature (2026-10-06): it scores a film, so it writes a mark.
    # Owner's ask, 2026-10-03: «Архів» left the strip; each figure opens its films.
    Then the strip offers no archive tab
    When I give the first film a score of "8.0"
    And I close the modal
    And I isolate the catalog to watched films
    Then the "Переглянуто" figure is lit, and its films stand under it
    When I press the "Рекомендую" figure
    Then the "Рекомендую" figure is lit, and its films stand under it
    And the "Переглянуто" figure is not lit
    When I press the "Серіалів" figure
    Then the "Серіалів" figure is lit, and its films stand under it
