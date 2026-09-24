Feature: The award breakdown and the critic popover
  Covers REQ A-1/A-3 (curated English ceremony names only), REQ A-4/A-5
  (categories in Ukrainian, revealed by a tap on a laurel) and REQ U-4 (an
  explanation appears next to the tapped element, never covering it).

  Scenario: The awards stand as laurels, and a tap opens a ceremony's categories
    # The open card, under the runtime line (A-5, 2026-09-25).
    Given a movie modal with awards is open
    Then every laurel names a curated English ceremony and says WINNER or NOMINATION
    When I tap the first laurel
    Then the popover names that ceremony and lists its categories in Ukrainian
    When I tap the first laurel
    Then the popover disappears

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
