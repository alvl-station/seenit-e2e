Feature: Deleting films is inactive on the shared catalogue
  The main screen lists the shared database everyone reads, so removal is
  not offered there any more (owner's call with the interface redesign):
  the menu row is inactive and explains itself in an anchored popover.
  Removal returns inside an open collection — with the КОШИК's 24-hour
  wait — when collections become writable; these scenarios grow back with
  that release.

  Scenario: The delete row is inactive and the bar stays hidden
    Then the delete bar is hidden
    And no card is selected for deletion
    And the delete menu row is inactive

  Scenario: Tapping the inactive row explains itself without engaging the mode
    When I tap the inactive delete row
    Then the popover explains deletion lives in collections
    And the delete bar is hidden
