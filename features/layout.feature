Feature: Card layout across view modes
  Two grids of posters (the list is gone, owner's ask 2026-09-15). Real
  browser only — jsdom does no layout.

  Scenario: The shelf's switches stand in the header's view control
    # A page until 2026-09-16, a drop on the bar until 2026-10-04; now one key
    # at the header's right that slides them out, wherever the library is.
    Then the shelf drop is shown with three keys
    When I open the recommendations flow
    Then the shelf drop is gone
    When I close the recommendations flow
    Then the shelf drop is shown with three keys

  Scenario: The small grid draws smaller posters than the medium grid
    When I switch the view to "grid-m"
    And I remember the width of the first poster
    And I switch the view to "grid-s"
    Then the first poster is narrower than remembered

  Scenario: The award row shows wins and nominations apart, and the breakdown stays behind a tap
    # The tile carries a cup with the wins and, to its right, a silver ring
    # with the nominations (2026-09-25); ceremony names only in the popover
    # a label opens (REQ A-5).
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

  Scenario: The strip is no longer arranged — no «Меню» tab, no arrange sheet
    # The arrangement (order and hidden tabs) retired on 2026-09-16: the
    # strip's last tab and the sheet it opened went with it.
    Then the strip offers no arrange tab
    And the arrange sheet does not exist

  Scenario: «To the top» grows into the strip once there is a way back, and takes you there
    # The strip's last item since 2026-10-04 (owner's design): a ring round a chevron.
    Then the catalogue has stopped arriving
    Then the strip offers no way to the top
    When I scroll three screens down the shelf
    Then the strip offers the way to the top
    When I press the way to the top
    Then the shelf is back at its top
