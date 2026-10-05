Feature: Toggle-off on second tap and hover on touch
  Covers REQ U-6 (a second tap returns the control to neutral) and the
  sticky :hover on touch devices. The genre is an option in the filter
  window now.

  Nothing here writes a mark. The archive scenario scores a film for its
  lists to hold (owner's ask, 2026-10-06: tests make the data they read), so
  it moved to marks.feature with the two count scenarios: a mark written or
  counted here would race the serial marks project.

  Scenario: A genre option deselects on a second tap
    Given the catalog has more than one genre
    When I tap the first genre option
    Then that option is active
    When I tap the first genre option
    Then that option is inactive
    And no genre option is chosen

  @phone-portrait
  Scenario: A tapped-then-deselected option keeps no sticky hover styling
    Given the catalog has more than one genre
    And I remember the border color of the first genre option
    When I touch-tap the first genre option
    And I touch-tap the first genre option again
    Then the option is inactive and its border color matches the remembered one
