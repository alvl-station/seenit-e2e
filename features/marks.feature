Feature: Marking a film watched or recommended
  The first scenarios in this suite that CHANGE anything.

  Until now every test here was read-only, because "переглянуто" and
  "рекомендую" were single nodes shared by every login: a test that marked a
  film changed the owner's real list. Marks now hang off the signed-in uid,
  so CI writes into its own account's subtree and nobody else's — and the
  database rules refuse anything else.

  kino/movies is still one shared catalog, so adding or deleting a film
  stays forbidden here. Each scenario also puts the mark back, so a run
  leaves the test account exactly as it found it.

  Scenario: Marking a film watched updates the card and the tab count
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    Then the first card is shown as watched
    And the "Дивився" count is one higher than remembered
    When I toggle "переглянуто" on the first card
    Then the first card is not shown as watched
    And the "Дивився" count is back to what I remembered

  Scenario: Marking a film recommended updates the tab count
    Given I remember the "Рекомендую" count
    When I toggle "рекомендую" on the first card
    Then the "Рекомендую" count is one higher than remembered
    When I toggle "рекомендую" on the first card
    Then the "Рекомендую" count is back to what I remembered

  Scenario: A watched film disappears from the default view and returns
    # The default view hides watched titles, so marking one is also the
    # quickest way to check that filter against real data.
    Given I remember the title of the first card
    When I toggle "переглянуто" on the first card
    Then that title is no longer in the default view
    When I isolate the catalog to watched films
    Then that title is listed
    And the "Дивився" tab count matches the films it lists
    When I toggle "переглянуто" on the first card
    Then the catalog shows at least one movie

  Scenario: A mark survives a page reload
    # Proves the mark reached the database rather than only the local copy —
    # the write goes to this account's own subtree, so it must persist.
    Given I remember the "Дивився" count
    When I toggle "переглянуто" on the first card
    And I reload the catalog
    Then the "Дивився" count is one higher than remembered
    When I isolate the catalog to watched films
    And I toggle "переглянуто" on the first card
    Then the "Дивився" count is back to what I remembered
