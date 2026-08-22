Feature: Toggle-off on second tap and hover on touch
  Covers REQ U-6 (a second tap returns the control to neutral — BUGS #4
  and the chip half of #7) and BUGS #3 (sticky :hover on touch devices).

  Scenario: A genre chip deselects on a second tap
    Given the catalog has more than one genre
    When I tap the first genre chip
    Then that chip is active
    When I tap the first genre chip
    Then that chip is inactive
    And the "all genres" chip is active

  Scenario: The "Рекомендую" tab deselects back to "Усі" on a second tap
    When I tap the "Рекомендую" tab
    Then the "Рекомендую" tab is active
    When I tap the "Рекомендую" tab
    Then the "Рекомендую" tab is inactive
    And the "Усі" tab is active

  @phone-portrait
  Scenario: A tapped-then-deselected chip keeps no sticky hover styling
    Given the catalog has more than one genre
    And I remember the border color of the first genre chip
    When I touch-tap the first genre chip
    And I touch-tap the first genre chip again
    Then the chip is inactive and its border color matches the remembered one
