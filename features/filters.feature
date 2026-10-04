Feature: The filter sheet — years and providers
  The «Роки» filter with its explicit «Усі» way out, and the «Де
  подивитись» filter that appears once the provider pass has populated the
  catalogue. Re-tapping a chosen decade also clears it (REQ U-6), but that
  gesture is invisible — «Усі» is the way out a person can actually see.

  Scenario: «Усі» is lit by default, and a decade narrows the shelf on «Застосувати»
    # The window hands its choices to the shelf only on the button (U-11):
    # until then the shelf behind it must not move.
    Then the catalogue has stopped arriving
    Given I remember how many cards the shelf shows
    When I open the filter sheet
    Then the year option "all" is active
    When I choose the year option "1990s"
    Then the year option "all" is inactive
    And the shelf shows the remembered number of cards again
    When I apply the filters
    Then every visible card's year is between 1990 and 1999

  Scenario: «Усі» clears a chosen decade and the whole shelf returns
    Then the catalogue has stopped arriving
    Given I remember how many cards the shelf shows
    When I open the filter sheet
    And I choose the year option "2000s"
    And I apply the filters
    And I open the filter sheet
    And I choose the year option "all"
    Then the year option "all" is active
    When I apply the filters
    Then the shelf shows the remembered number of cards again

  Scenario: The provider filter is built from the catalogue, or absent
    # An option for a service no film is on would filter to an empty
    # screen, so the section stays hidden until the provider pass has run.
    # Both states are correct; what this asserts is that the offered
    # options actually narrow the shelf rather than emptying it.
    Then the catalogue has stopped arriving
    When I open the filter sheet
    Then the provider filter, when offered, narrows the shelf without emptying it

  Scenario: The panel names what is chosen, counts it on «Показати», and the strip wears a badge
    # The filter is a pane of glass over the shelf since 2026-10-03 (owner's design).
    Then the catalogue has stopped arriving
    When I open the filter sheet
    And I choose the year option "1990s"
    Then the filter panel shows a chip "1990–1999"
    And the panel's main key offers to show some films
    When I apply the filters
    Then the strip's filter tab wears the badge "1"
    When I open the filter sheet
    And I take the chip "1990–1999" off
    And I apply the filters
    Then the strip's filter tab wears no badge

  Scenario: Several genres at once, each its own chip
    # Owner's ask, 2026-10-04: the filter takes several genres, as it takes several decades.
    Then the catalogue has stopped arriving
    When I open the filter sheet
    And I choose the genre option "Комедії"
    And I choose the genre option "Жахи"
    Then the filter panel shows a chip "Комедії"
    And the filter panel shows a chip "Жахи"
    When I apply the filters
    Then the strip's filter tab wears the badge "2"
    When I open the filter sheet
    And I choose the genre option "all"
    And I apply the filters
    Then the strip's filter tab wears no badge
