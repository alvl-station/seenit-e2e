Feature: Toggle-off on second tap and hover on touch
  Covers REQ U-6 (a second tap returns the control to neutral) and the
  sticky :hover on touch devices. The genre is an option in the filter
  window now; the archive's lists are figures on the account's statistics.

  Read-only. The two count scenarios that used to close this file live in
  marks.feature now: a count read here raced a mark being set there.

  Scenario: A genre option deselects on a second tap
    Given the catalog has more than one genre
    When I tap the first genre option
    Then that option is active
    When I tap the first genre option
    Then that option is inactive
    And no genre option is chosen

  Scenario: The archive is the account's statistics, one list at a time
    # Owner's ask, 2026-10-03: «Архів» left the strip; each figure opens its films.
    Then the strip offers no archive tab
    When I isolate the catalog to watched films
    Then the "Переглянуто" figure is lit, and its films stand under it
    When I press the "Рекомендую" figure
    Then the "Рекомендую" figure is lit, and its films stand under it
    And the "Переглянуто" figure is not lit
    When I press the "Серіалів" figure
    Then the "Серіалів" figure is lit, and its films stand under it

  @phone-portrait
  Scenario: A tapped-then-deselected option keeps no sticky hover styling
    Given the catalog has more than one genre
    And I remember the border color of the first genre option
    When I touch-tap the first genre option
    And I touch-tap the first genre option again
    Then the option is inactive and its border color matches the remembered one
