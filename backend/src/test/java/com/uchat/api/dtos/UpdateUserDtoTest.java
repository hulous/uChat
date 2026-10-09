package com.uchat.api.dtos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class UpdateUserDtoTest {
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void passwordMustBeBlankOrAtLeastEightCharacters() {
    assertTrue(validator.validate(updateWithPassword(null)).stream().noneMatch(violation -> violation.getPropertyPath().toString().equals("password")));
    assertTrue(validator.validate(updateWithPassword(" ")).stream().noneMatch(violation -> violation.getPropertyPath().toString().equals("password")));
    assertEquals(1, validator.validate(updateWithPassword("1234567")).stream().filter(violation -> violation.getPropertyPath().toString().equals("password")).count());
    assertTrue(validator.validate(updateWithPassword("12345678")).stream().noneMatch(violation -> violation.getPropertyPath().toString().equals("password")));
  }

  private UpdateUserDto updateWithPassword(String password) {
    return new UpdateUserDto().setEmail("user@example.com").setName("User").setPassword(password);
  }
}
