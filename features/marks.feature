Feature: Marking a film watched or recommended
  The first scenarios in this suite that CHANGE anything.

  Until now every test here was read-only, because "переглянуто" and
  "рекомендую" were single nodes shared by every login: a test that marked a
  film changed the owner's real list. Marks now hang off the signed-in uid,
  so CI writes into its own account's subtree and nobody else's — and the
  database rules refuse anything else.

  kino/movies is still one shared catalog, so adding or deleting a film
  stays forbidden here.

  Every scenario removes its own mark again, and does so BY TITLE. That is
  not a stylistic choice: a watched film sinks to the end of its genre
  section, so "the first card" can be a different film immediately
  afterwards, and a cleanup step working by position would unmark the wrong
  one and leave the original marked for good.

  Scenario: Marking a film watched raises the count and sinks it, it does not hide it
    # Interface-book rule: the shelf shows what is done as done. Watched
    # stays listed — dimmed and at the end of its section — never hidden.
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    Then the "Дивився" count is one higher than remembered
    And that title is listed
    And that film is shown as watched
    When I isolate the catalog to watched films
    Then that title is listed
    When I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: The heart turns the eye on — recommending also marks watched
    # Interface-book rule: «рекомендую, але не дивився» is not a state.
    # One tap on the heart raises BOTH counts; taking the heart off leaves
    # the eye on, so the cleanup unmarks watched separately.
    Given I remember the "Рекомендую" count
    And I remember the "Дивився" count
    When I toggle "рекомендую" on the first card
    Then the "Рекомендую" count is one higher than remembered
    And the "Дивився" count is one higher than remembered
    And that film is shown as watched
    And that title is listed
    When I toggle "рекомендую" on that film
    Then the "Рекомендую" count is back to what I remembered
    And the "Дивився" count is still one higher than remembered
    When I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: The watched tab lists exactly what its count claims
    # The production bug this suite could not catch before: the chip read
    # "Дивився (4)" over a list of three films.
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    And I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists
    When I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered

  Scenario: A mark survives a page reload
    # Proves the mark reached the database rather than only the local copy —
    # the write goes to this account's own subtree, so it must persist.
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    And I reload the catalog
    Then the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    And I toggle "переглянуто" on that film
    Then the "Дивився" count is back to what I remembered
