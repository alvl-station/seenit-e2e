Feature: The awards tab and the critic popover
  Covers REQ A-1/A-3 (curated English ceremony names only), REQ A-4/A-5
  (categories in Ukrainian, and the result) and REQ U-4 (an explanation appears next to
  the tapped element, never covering it). Since the film card of 2026-10-07
  (design/seenit-film-card-spec.md) the awards are a tab of rows, not
  laurels with a popover: the awards tile opens it, wins come first, and
  past four rows the rest fold behind «Ще N».

  Scenario: The awards tile opens the awards tab, four rows shown and the rest folded
    Given a movie modal with more than four awards is open
    When I press the awards tile
    Then the awards tab is open
    And every award row names a curated English ceremony and says its result in Ukrainian, wins first
    And at most four award rows are shown, and the fold key says how many more
    When I unfold the rest of the awards
    Then every award row is shown, and the key folds them again

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
