Feature: Card layout across view modes
  Covers BUGS #2 (list view collapsing into a stack, stretched badges) and
  BUGS #11 (rating badge overlapping the type/year line). Real browser
  only — jsdom does no layout.

  Scenario: List view lays a card out as a horizontal row
    When I switch the view to "list"
    Then the card title sits to the right of the poster
    And the card is compact: height under half its width

  Scenario: Small grid shows the compact award badge instead of full pills
    Given the catalog has a movie with awards
    When I switch the view to "grid-s"
    Then that card shows the compact award badge and hides the full pills
    And the badges stay within the card width

  @phone-portrait
  Scenario: The rating badge never overlaps the type/year line
    When I switch the view to "grid-s"
    Then no rating badge intersects the type and year text
