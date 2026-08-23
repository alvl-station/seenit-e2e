Feature: Card layout across view modes
  Covers BUGS #2 (list view collapsing into a stack, stretched badges) and
  BUGS #11 (rating badge overlapping the type/year line). Real browser
  only — jsdom does no layout.

  Scenario: List view lays a card out as a horizontal row
    When I switch the view to "list"
    Then the card title sits to the right of the poster
    And the card is compact: height under half its width

  Scenario: Awards live only on the poster trophy, in every grid view
    # Owner's call: the under-title badge row showed a second trophy with a
    # different tally (wins+nominations vs wins) and the pair read as a
    # contradiction. One trophy on the poster now, wins only, tappable for
    # the per-ceremony breakdown.
    Given the catalog has a movie with awards
    Then that card shows the poster trophy and no under-title award row
    When I switch the view to "grid-s"
    Then that card shows the poster trophy and no under-title award row
    When I tap that card's poster trophy
    Then the award breakdown popover is shown

  @phone-portrait
  Scenario: The rating badge never overlaps the type/year line
    When I switch the view to "grid-s"
    Then no rating badge intersects the type and year text
