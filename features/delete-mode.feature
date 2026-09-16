Feature: Deleting films is nowhere near the shared catalogue
  The main screen lists the shared database everyone reads, so removal is
  not offered there at all (owner's call): deletion lives under an owned
  collection's own plate. What this feature guards is the absence — no tab,
  no bar, no armed mode on the shelf everybody shares.

  Scenario: The strip offers no way to delete films from the shelf
    Then the strip offers no way to delete films
    And the delete bar is hidden
    And no card is selected for deletion
