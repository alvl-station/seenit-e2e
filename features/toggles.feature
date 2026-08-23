Feature: Toggle-off on second tap and hover on touch
  Covers REQ U-6 (a second tap returns the control to neutral — BUGS #4
  and the chip half of #7) and BUGS #3 (sticky :hover on touch devices).

  Scenario: A genre chip deselects on a second tap
    Given the catalog has more than one genre
    When I tap the first genre chip
    Then that chip is active
    When I tap the first genre chip
    Then that chip is inactive
    And no genre chip is highlighted

  Scenario: The "Рекомендую" tab deselects to neutral on a second tap
    When I tap the "Рекомендую" tab
    Then the "Рекомендую" tab is active
    When I tap the "Рекомендую" tab
    Then the "Рекомендую" tab is inactive
    And no catalog tab is highlighted

  @phone-portrait
  Scenario: A tapped-then-deselected chip keeps no sticky hover styling
    Given the catalog has more than one genre
    And I remember the border color of the first genre chip
    When I touch-tap the first genre chip
    And I touch-tap the first genre chip again
    Then the chip is inactive and its border color matches the remembered one

  # Strengthens this feature's existing coverage: the scenarios above check
  # that a tab activates and deactivates, never that the number beside it is
  # true. The number was the half that was wrong in production — "Дивився
  # (4)" over a list of three films, because a mark outlived its movie.
  Scenario: The "Дивився" count matches the films it lists
    When I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists

  Scenario: The "Рекомендую" count matches the films it lists
    When I tap the "Рекомендую" tab
    Then the "Рекомендую" tab count matches the films it lists
