Feature: Award and critic badges and their anchored popover
  Covers REQ A-1/A-3 (curated English ceremony names only), REQ U-4 (an
  explanation appears next to the tapped element, never covering it) and
  the popup-drift half of BUGS #2.

  Scenario: Award pills carry only curated English ceremony names
    Given a movie modal with awards is open
    Then every award pill is labeled with a curated English name

  Scenario: The popover opens adjacent to the tapped pill
    Given a movie modal with awards is open
    When I tap the first tappable award pill
    Then the popover is visible next to the pill and does not cover it

  Scenario: The popover dismisses on a tap outside it
    Given a movie modal with awards is open
    When I tap the first tappable award pill
    And I tap outside the popover
    Then the popover disappears

  Scenario: The critic badge explains itself in an anchored popover
    Given a movie modal with a critic score is open
    When I tap the critic badge
    Then the popover is visible next to the badge and contains "%"
