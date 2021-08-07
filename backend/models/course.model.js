const { default: knex } = require("knex");
const db = require("../utils/db");
const TB_NAME = "course";

module.exports = {
  async all(query) {
    let queryData = [];
    const { search, price } = query;
    const cat_id = "categories" in query ? query.categories.split(".") : null;
    if (cat_id) {
      for (let i = 0; i < cat_id.length; i++) {
        const data = await db(TB_NAME).where("category_id", cat_id[i]);
        queryData = [...queryData, ...data];
      }
    } else {
      if ("search" in query && "price" in query) {
        queryData = await db(TB_NAME)
          .whereRaw(`MATCH(courseName) AGAINST('${search}')`)
          .andWhere("isDeleted", false)
          .orderBy("price", `${price}`);
      } else if ("search" in query) {
        queryData = await db(TB_NAME)
          .whereRaw(`MATCH(courseName) AGAINST('${search}')`)
          .andWhere("isDeleted", false);
      } else if ("order" in query) {
        queryData = await db(TB_NAME)
          .andWhere("isDeleted", false)
          .orderBy("price", `${price}`);
      } else {
        queryData = await db(TB_NAME).where("isDeleted", false);
      }
    }

    return queryData;
  },

  async singleById(id) {
    const course = await db(TB_NAME)
      .where("id", id)
      .andWhere("isDeleted", false);
    if (course.length === 0) return null;
    return course[0];
  },

  allFullTextSearch(search) {
    return db(TB_NAME).whereRaw(`MATCH(courseName) AGAINST('${search}')`);
  },

  newestCourse(limit) {
    return db(TB_NAME).orderBy("logCreatedDate", "desc").limit(limit);
  },

  mostViewCourse(limit) {
    return db(TB_NAME).orderBy("view", "desc").limit(limit);
  },

  async singleByName(name) {
    const course = await db(TB_NAME)
      .where("courseName", name)
      .andWhere("isDeleted", false);
    if (course.length === 0) return null;
    return course[0];
  },

  add(course) {
    return db(TB_NAME).insert(course);
  },

  async delete(id) {
    const course = await this.singleById(id);
    if (course === null) return null;

    return db(TB_NAME).where("id", id).update({
      isDeleted: true,
      logUpdatedDate: new Date(),
    });
  },

  async update(id, courseUpdated) {
    const course = await this.singleById(id);
    if (!course) {
      return null;
    }

    courseUpdated.logUpdatedDate = new Date();
    return db(TB_NAME).where("id", id).update(courseUpdated);
  },

  async updateView(id) {
    const course = await this.singleById(id);
    if (!course) {
      return null;
    }
    const view = course.view;

    return db(TB_NAME)
      .where("id", id)
      .update("view", view + 1);
  },
  async getCountOfCourseByCategory(categoryId) {
    const countOfCat = await db(TB_NAME)
      .where("category_id", categoryId)
      .andWhere("isDeleted", false);
    if (!countOfCat) {
      return null;
    }

    return countOfCat;
  },
};
