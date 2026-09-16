Feature: Card layout across view modes
  Two grids of posters (the list is gone, owner's ask 2026-09-15). Real
  browser only — jsdom does no layout.

  Scenario: The small grid draws smaller posters than the medium grid
    When I switch the view to "grid-m"
    And I remember the width of the first poster
    And I switch the view to "grid-s"
    Then the first poster is narrower than remembered

  Scenario: The award row shows two sums, and the breakdown stays behind a tap
    # Awards are data: «НАГОРОДИ n» and «НОМІНАЦІЇ n» in the data block,
    # ceremony names only in the popover the row opens (REQ A-5).
    Given the catalog has a movie with awards
    Then that card shows the award row with no ceremony names
    When I switch the view to "grid-s"
    Then that card shows the award row with no ceremony names
    When I tap that card's award row
    Then the award breakdown popover is shown

  Scenario: In the small grid the award row keeps working
    Given the catalog has a movie with awards
    When I switch the view to "grid-s"
    Then that card shows the award row with no ceremony names
    When I tap that card's award row
    Then the award breakdown popover is shown

  @phone-portrait
  Scenario: The rating badge never overlaps the type/year line
    When I switch the view to "grid-s"
    Then no rating badge intersects the type and year text
