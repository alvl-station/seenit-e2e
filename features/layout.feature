Feature: Card layout across view modes
  Covers BUGS #2 (list view collapsing into a stack, stretched badges) and
  BUGS #11 (rating badge overlapping the type/year line). Real browser
  only — jsdom does no layout.

  Scenario: List view lays a card out as a horizontal row
    When I switch the view to "list"
    Then the card title sits to the right of the poster
    And the card is compact: height under half its width

  Scenario: The award row shows two sums, and the breakdown stays behind a tap
    # Interface-book redesign: awards are data, so they moved off the poster
    # into the data block — «НАГОРОДИ n» and «НОМІНАЦІЇ n», wins and
    # nominations summed across ceremonies. Ceremony names never appear on
    # the card (REQ A-5): they live in the popover the row opens.
    Given the catalog has a movie with awards
    Then that card shows the award row with no ceremony names
    When I switch the view to "grid-s"
    Then that card shows the award row with no ceremony names
    When I tap that card's award row
    Then the award breakdown popover is shown

  @phone-portrait
  Scenario: The eye and the heart live in the data block, off the poster
    # Interface-book redesign: the poster carries nothing any more. The
    # toggles are data-block controls now — a 15px drawing in a 26px cell —
    # so they must sit BELOW the poster, never overlap it.
    Given the catalog has a movie with awards
    Then both toggles sit below that card's poster

  Scenario: In the list view the award row keeps working
    # The list row lays the same card pieces out horizontally; the award
    # row must survive that relayout and still open its breakdown.
    Given the catalog has a movie with awards
    When I switch the view to "list"
    Then that card shows the award row with no ceremony names
    When I tap that card's award row
    Then the award breakdown popover is shown

  @phone-portrait
  Scenario: The rating badge never overlaps the type/year line
    When I switch the view to "grid-s"
    Then no rating badge intersects the type and year text
