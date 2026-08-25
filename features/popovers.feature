Feature: The award breakdown and the critic popover
  Covers REQ A-1/A-3 (curated English ceremony names only), REQ A-4/A-5
  (categories in Ukrainian, revealed only by a tap) and REQ U-4 (an
  explanation appears next to the tapped element, never covering it).

  Scenario: The award row shows sums and unfolds the per-ceremony schedule
    Given a movie modal with awards is open
    Then the award row shows sums and no ceremony names
    When I unfold the award breakdown
    Then every ceremony header is a curated English name
    And every category bullet reads in Ukrainian
    When I tap the award row again
    Then the breakdown folds back

  Scenario: The critic badge explains itself in an anchored popover
    Given a movie modal with a critic score is open
    When I tap the critic badge
    Then the popover is visible next to the badge and contains "%"

  Scenario: The popover dismisses on a tap outside it
    Given a movie modal with a critic score is open
    When I tap the critic badge
    And I tap outside the popover
    Then the popover disappears

  Scenario: The popover closes on a second tap on the same badge
    Given a movie modal with a critic score is open
    When I tap the critic badge
    And I tap the critic badge
    Then the popover disappears
