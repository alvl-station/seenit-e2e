Feature: Deleting films is nowhere near the shared catalogue
  The main screen lists the shared database everyone reads, so removal is
  not offered there AT ALL any more (owner's call): the menu row that used
  to sit greyed-out explaining itself is gone, and deletion lives under an
  owned collection's own plate, beside adding and renaming. What this
  feature guards is the absence — no row, no bar, no armed mode on the
  shelf everybody shares.

  Scenario: The menu offers no way to delete films from the shelf
    When I open the menu
    Then the menu has no delete row
    And the delete bar is hidden
    And no card is selected for deletion
