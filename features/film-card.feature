Feature: The open card — facts and a series' seasons
  Shipped 2026-09-16/17. The facts read «year · type · genre» on one line
  and the country on a line of its own. A series' seasons have a tab of
  their own, «Сезони [N]» (2026-09-19): every season is listed there as a
  row that names itself and comes shut, and pressing it lays out its
  episodes (owner's ask, 2026-09-21: an open wall of dates was a page
  nobody asked for). Read-only: nothing is marked, added or created — a
  season is only opened and shut, its eye and its episodes never pressed.

  Scenario: A film card puts the country on its own line under the facts
    When I open the first card
    Then the card shows the year, type and genre on one line
    And the country, when the film has one, stands on a line of its own
    When I close the modal
    Then the modal is closed

  Scenario: A series card lists its seasons on their own tab, and a season opens to its episodes
    When I switch the shelf to "series"
    Given a series card with seasons is open
    Then the seasons tab counts the seasons in square brackets
    And every season is listed by name, shut
    When I open a season
    Then that season's episodes are shown, and only that season's
    When I shut that season
    Then every season is listed by name, shut
