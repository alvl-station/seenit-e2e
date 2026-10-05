Feature: Picks — the catalogue edited onto a strip and shown by a projector
  Read-only (REQ T-4): the strip lives on the page and writes nothing.
  REQUIREMENTS PR-5d.

  Scenario: Three steps — edit a frame in, cut another, and the show is on
    When I open the address "picks"
    Then the bench stands on the first step with an empty strip
    When I edit the first genre onto the strip
    Then the strip holds one frame, and its frame is lit
    When I go on to the cut
    And I cut the second genre
    Then a struck-through frame is spliced into the strip
    When I start the show
    Then the screen shows at most eight films, made from the strip
    And the address is "/picks"
    When I stop the projector
    Then the strip is as I left it

  Scenario: Films off — the show is series only
    When I open the address "picks"
    And I switch off films
    Then films are off and series stay on
    When I start the show
    Then every title on the screen is a series, and the show says so
