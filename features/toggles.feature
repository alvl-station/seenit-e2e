Feature: Toggle-off on second tap and hover on touch
  Covers REQ U-6 (a second tap returns the control to neutral) and the
  sticky :hover on touch devices. The genre is an option in the filter
  window now; «Рекомендую» is a word inside the archive.

  Scenario: A genre option deselects on a second tap
    Given the catalog has more than one genre
    When I tap the first genre option
    Then that option is active
    When I tap the first genre option
    Then that option is inactive
    And no genre option is chosen

  Scenario: The "Рекомендую" word deselects to «Усі» on a second tap
    When I isolate the catalog to watched films
    And I tap the "Рекомендую" word
    Then the "Рекомендую" word is active
    When I tap the "Рекомендую" word
    Then the "Рекомендую" word is inactive
    And the archive shows everything

  @phone-portrait
  Scenario: A tapped-then-deselected option keeps no sticky hover styling
    Given the catalog has more than one genre
    And I remember the border color of the first genre option
    When I touch-tap the first genre option
    And I touch-tap the first genre option again
    Then the option is inactive and its border color matches the remembered one

  Scenario: The "Дивився" count matches the films the archive lists
    When I isolate the catalog to watched films
    Then the "Дивився" tab count matches the films it lists

  Scenario: The "Рекомендую" count matches the films the archive lists under it
    When I isolate the catalog to watched films
    And I narrow the archive to "Рекомендую"
    Then the "Рекомендую" tab count matches the films it lists
