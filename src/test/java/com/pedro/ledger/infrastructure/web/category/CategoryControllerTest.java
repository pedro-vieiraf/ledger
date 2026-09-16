package com.pedro.ledger.infrastructure.web.category;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pedro.ledger.application.category.CategoryApplicationService;
import com.pedro.ledger.domain.category.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private CategoryApplicationService service;

  @Nested
  class Create {

    @Test
    void shouldCreateCategory() throws Exception {
      Category category = Category.create("Food");

      when(service.create(eq("Food")))
          .thenReturn(category);

      mockMvc.perform(
              post("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                  {
                    "name": "Food"
                  }
                  """)
          )
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.id")
              .value(category.getId().toString()))
          .andExpect(jsonPath("$.name")
              .value("Food"));

      verify(service)
          .create(eq("Food"));
    }
  }

  @Nested
  class FindAll {

    @Test
    void shouldReturnAllCategories() throws Exception {
      Category category1 = Category.create("Food");
      Category category2 = Category.create("Entertainment");

      when(service.findAll())
          .thenReturn(List.of(category1, category2));

      mockMvc.perform(
              get("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$.length()").value(2))
          .andExpect(jsonPath("$[0].id")
              .value(category1.getId().toString()))
          .andExpect(jsonPath("$[0].name")
              .value("Food"))
          .andExpect(jsonPath("$[1].id")
              .value(category2.getId().toString()))
          .andExpect(jsonPath("$[1].name")
              .value("Entertainment"));

      verify(service)
          .findAll();
    }

    @Test
    void shouldReturnEmptyListWhenThereAreNoCategories()
        throws Exception {

      when(service.findAll())
          .thenReturn(List.of());

      mockMvc.perform(
              get("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$.length()").value(0));

      verify(service)
          .findAll();
    }

    @Test
    void shouldReturnBadRequestWhenNameIsBlank() throws Exception {
      mockMvc.perform(
              post("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
              {
                "name": "   "
              }
              """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(service);
    }

    @Test
    void shouldReturnBadRequestWhenNameIsEmpty() throws Exception {
      mockMvc.perform(
              post("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
              {
                "name": ""
              }
              """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(service);
    }

    @Test
    void shouldReturnBadRequestWhenNameIsMissing() throws Exception {
      mockMvc.perform(
              post("/categories")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
              {
              }
              """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(service);
    }
  }

  @Nested
  class FindById {

    @Test
    void shouldReturnCategoryById() throws Exception {
      UUID categoryId = UUID.randomUUID();

      Category category = Category.restore(
          categoryId,
          "Food"
      );

      when(service.findById(categoryId))
          .thenReturn(Optional.of(category));

      mockMvc.perform(
              get("/categories/{id}", categoryId)
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id")
              .value(categoryId.toString()))
          .andExpect(jsonPath("$.name")
              .value("Food"));

      verify(service)
          .findById(categoryId);
    }

    @Test
    void shouldReturnNotFoundWhenCategoryDoesNotExist()
        throws Exception {

      UUID categoryId = UUID.randomUUID();

      when(service.findById(categoryId))
          .thenReturn(Optional.empty());

      mockMvc.perform(
              get("/categories/{id}", categoryId)
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isNotFound());

      verify(service)
          .findById(categoryId);
    }
  }

  @Nested
  class Update {

    @Test
    void shouldUpdateCategory() throws Exception {
      UUID categoryId = UUID.randomUUID();

      Category category = Category.restore(
          categoryId,
          "Groceries"
      );

      when(service.update(
          eq(categoryId),
          eq("Groceries")
      )).thenReturn(category);

      mockMvc.perform(
              patch("/categories/{id}", categoryId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                  {
                    "name": "Groceries"
                  }
                  """)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id")
              .value(categoryId.toString()))
          .andExpect(jsonPath("$.name")
              .value("Groceries"));

      verify(service).update(
          eq(categoryId),
          eq("Groceries")
      );
    }

    @Test
    void shouldReturnNotFoundWhenCategoryDoesNotExist()
        throws Exception {

      UUID categoryId = UUID.randomUUID();

      when(service.update(
          eq(categoryId),
          eq("Groceries")
      )).thenThrow(
          new IllegalArgumentException("Category not found")
      );

      mockMvc.perform(
              patch("/categories/{id}", categoryId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                  {
                    "name": "Groceries"
                  }
                  """)
          )
          .andExpect(status().isNotFound());

      verify(service).update(
          eq(categoryId),
          eq("Groceries")
      );
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeleteCategory() throws Exception {
      UUID categoryId = UUID.randomUUID();

      doNothing()
          .when(service)
          .delete(categoryId);

      mockMvc.perform(
              delete("/categories/{id}", categoryId)
          )
          .andExpect(status().isNoContent());

      verify(service)
          .delete(categoryId);
    }

    @Test
    void shouldReturnNotFoundWhenCategoryDoesNotExist()
        throws Exception {

      UUID categoryId = UUID.randomUUID();

      doThrow(
          new IllegalArgumentException("Category not found")
      ).when(service).delete(categoryId);

      mockMvc.perform(
              delete("/categories/{id}", categoryId)
          )
          .andExpect(status().isNotFound());

      verify(service)
          .delete(categoryId);
    }
  }
}