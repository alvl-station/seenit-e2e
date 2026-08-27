Feature: The filter sheet — years and providers
  The «Роки» filter with its explicit «Усі» way out, and the «Де
  подивитись» filter that appears once the provider pass has populated the
  catalogue. Re-tapping a chosen decade also clears it (REQ U-6), but that
  gesture is invisible — «Усі» is the way out a person can actually see.

  Scenario: «Усі» is lit by default, and a decade narrows the shelf to its years
    Then the catalogue has stopped arriving
    When I open the filter sheet
    Then the year option "all" is active
    When I choose the year option "1990s"
    Then the year option "all" is inactive
    And every visible card's year is between 1990 and 1999

  Scenario: «Усі» clears a chosen decade and the whole shelf returns
    Then the catalogue has stopped arriving
    Given I remember how many cards the shelf shows
    When I open the filter sheet
    And I choose the year option "2000s"
    And I choose the year option "all"
    Then the year option "all" is active
    And the shelf shows the remembered number of cards again

  Scenario: The provider filter is built from the catalogue, or absent
    # An option for a service no film is on would filter to an empty
    # screen, so the section stays hidden until the provider pass has run.
    # Both states are correct; what this asserts is that the offered
    # options actually narrow the shelf rather than emptying it.
    Then the catalogue has stopped arriving
    When I open the filter sheet
    Then the provider filter, when offered, narrows the shelf without emptying it
