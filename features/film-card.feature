Feature: The open card — facts and a series' seasons
  Shipped 2026-09-16/17. The facts read «year · type · genre» on one line
  and the country on a line of its own. A series card carries a «Сезони»
  dropdown with the chosen season's episodes shown under it without a
  press. Read-only: nothing is marked, added or created.

  Scenario: A film card puts the country on its own line under the facts
    When I open the first card
    Then the card shows the year, type and genre on one line
    And the country, when the film has one, stands on a line of its own
    When I close the modal
    Then the modal is closed

  Scenario: A series card shows every season with its episodes
    When I switch the shelf to "series"
    Given a series card with seasons is open
    Then the seasons tab counts the seasons in square brackets
    And every season is shown with its episodes, without pressing anything
