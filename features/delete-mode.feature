Feature: Deleting films from the catalog
  Delete mode lives at the top of the page so several films can be picked and
  removed with one confirmation, rather than one at a time through a card's
  modal.

  These scenarios are READ-ONLY and must stay that way. kino/movies is a
  single global catalog shared by every login — there is no per-user data —
  so a confirmed delete from CI would destroy the owner's real films. Every
  scenario below either cancels or leaves the mode; the confirm dialog is
  armed to answer "no" before the mode is even entered.

  Scenario: Delete mode is off until it is asked for
    Then the delete bar is hidden
    And no card is selected for deletion

  Scenario: Entering delete mode arms the bar but selects nothing
    When I enter delete mode
    Then the delete bar is visible
    And no card is selected for deletion
    And the delete button is disabled

  Scenario: Selecting a film enables the delete button and counts it
    When I enter delete mode
    And I select the first card for deletion
    Then 1 card is selected for deletion
    And the delete button is enabled
    And the delete bar says "Вибрано 1 фільм"

  Scenario: Tapping a selected film deselects it again
    When I enter delete mode
    And I select the first card for deletion
    And I select the first card for deletion
    Then no card is selected for deletion
    And the delete button is disabled

  Scenario: Selecting a film does not open its details
    When I enter delete mode
    And I select the first card for deletion
    Then the movie modal is not open

  Scenario: Cancelling leaves delete mode and clears the selection
    When I enter delete mode
    And I select the first card for deletion
    And I cancel delete mode
    Then the delete bar is hidden
    When I enter delete mode
    Then no card is selected for deletion
