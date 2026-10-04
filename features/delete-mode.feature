Feature: Deleting films is nowhere near the shared catalogue
  The main screen lists the shared database everyone reads, so removal is
  not offered there at all (owner's call): a film is taken out of a
  collection of mine, in that collection's editor. What this feature guards
  is the absence of a way to delete from the shelf everybody shares. The
  delete mode and its bar left the app on 2026-10-04 (seenit-frontend #574).

  Scenario: The strip offers no way to delete films from the shelf
    Then the strip offers no way to delete films
