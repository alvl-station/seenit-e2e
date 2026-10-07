Feature: The open card — facts, a series' seasons and sharing
  The facts read «year · type · genre · country» on one grey line under the
  title since the film card of 2026-10-07 (design/seenit-film-card-spec.md;
  from 2026-09-16 the country stood on a line of its own), and the details
  tab names the country again beside the age. A series' seasons have a tab
  of their own, named «Сезони [N]» (2026-09-19; an icon key since
  2026-10-07): every season is listed there as a row that names itself and
  comes shut, and pressing it lays out its episodes (owner's ask, 2026-09-21: an open wall of dates was a page
  nobody asked for). The share key opens the share sheet with a ready
  picture (2026-10-07). Read-only: nothing is marked, added, created or
  shared — a season is only opened and shut, its eye and its episodes never
  pressed, and the share sheet's networks and keys are never pressed.

  Scenario: A film card says its facts on one line, the country last and again in the details
    When I open the first card
    Then the card shows the year, type and genre on one line
    And the country, when the film has one, ends that line and is named in the details
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

