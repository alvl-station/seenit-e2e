Feature: Picks — the catalogue cooked in a cauldron
  Read-only (REQ T-4): the pot's contents live on the page and write nothing.
  REQUIREMENTS PR-5d.

  Scenario: Three steps — throw in, skip the second, and a dish is served
    When I open the address "picks"
    Then the cauldron stands on the first step with an empty pot
    When I throw the first genre into the pot
    Then the pot holds one thing, and its chip is lit
    When I go on to the second step
    And I ask the pot for its dish
    Then the dish is at most ten films, cooked from what was thrown in
    And the address is "/picks"
    When I go back to change the criteria
    Then the pot is as I left it

  Scenario: Films off — the dish is series only
    When I open the address "picks"
    And I switch off films
    Then films are off and series stay on
    When I ask the pot for its dish
    Then every title in the dish is a series, and the dish says so
