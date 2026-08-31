function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(value);
}

function parseSafeSourceUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : false;
  } catch {
    return false;
  }
}

const SENSITIVE_QUERY_PARAMETER = /(?:^|[_-])(?:access(?:[_-]?(?:key|token))?|api(?:[_-]?key)?|auth(?:orization)?|client(?:[_-]?secret)?|credential|key|pass(?:word)?|private(?:[_-]?key)?|secret|session(?:[_-]?id)?|sig(?:nature)?|token)(?:$|[_-])/i;

function normalizeQueryParameterName(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
}

function hasSensitiveSourceUrlData(url) {
  return Boolean(url.username || url.password)
    || [...url.searchParams.keys()].some((key) => SENSITIVE_QUERY_PARAMETER.test(normalizeQueryParameterName(key)));
}

function hasUniqueValues(items) {
  return new Set(items).size === items.length;
}

export function validateCourse(course) {
  const errors = [];
  const lessonSourceMappings = [];

  if (!course || typeof course !== 'object' || Array.isArray(course)) {
    return { ok: false, errors: ['course must be an object'] };
  }

  if (!course.meta || typeof course.meta !== 'object') {
    errors.push('course meta is missing');
  } else {
    if (!isNonEmptyString(course.meta.id)) errors.push('course meta id is missing');
    if (!isNonEmptyString(course.meta.title)) errors.push('course meta title is missing');
    if (!isNonEmptyString(course.meta.description)) errors.push('course meta description is missing');
    if (!isNonEmptyString(course.meta.language)) errors.push('course meta language is missing');
  }

  if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
    errors.push('lessons must be non-empty');
  } else {
    const ids = [];
    const slugs = [];

    for (const lesson of course.lessons) {
      if (!lesson || typeof lesson !== 'object') {
        errors.push('lesson must be an object');
        continue;
      }

      if (!isNonEmptyString(lesson.id)) errors.push('lesson id is missing');
      if (!isNonEmptyString(lesson.slug)) errors.push('lesson slug is missing');
      else if (!isSafeSlug(lesson.slug)) errors.push(`lesson ${lesson.id || '(unknown)'} slug must be URL-safe`);
      if (!isNonEmptyString(lesson.title)) errors.push(`lesson ${lesson.id || '(unknown)'} is missing title`);
      if (!isNonEmptyString(lesson.outcome)) errors.push(`lesson ${lesson.id || '(unknown)'} is missing outcome`);
      if (!isNonEmptyString(lesson.retrieval)) errors.push(`lesson ${lesson.id || '(unknown)'} is missing retrieval prompt`);
      if (!isNonEmptyString(lesson.nextStep)) errors.push(`lesson ${lesson.id || '(unknown)'} is missing next step`);
      if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) {
        errors.push(`lesson ${lesson.id || '(unknown)'} sections must be non-empty`);
      } else {
        for (const section of lesson.sections) {
          if (!section || typeof section !== 'object' || !isNonEmptyString(section.heading) || !isNonEmptyString(section.body)) {
            errors.push(`lesson ${lesson.id || '(unknown)'} sections must have heading and body`);
            break;
          }
        }
      }
      if (!Array.isArray(lesson.practice) || lesson.practice.length === 0) {
        errors.push(`lesson ${lesson.id || '(unknown)'} practice must be non-empty`);
      } else if (lesson.practice.some((item) => !isNonEmptyString(item))) {
        errors.push(`lesson ${lesson.id || '(unknown)'} practice items must be non-empty strings`);
      }
      if (!Array.isArray(lesson.sourceIds)) errors.push(`lesson ${lesson.id || '(unknown)'} source IDs must be an array`);
      else lessonSourceMappings.push({ lesson, sourceIds: lesson.sourceIds });
      if (!lesson.quiz || typeof lesson.quiz !== 'object') {
        errors.push(`lesson ${lesson.id || '(unknown)'} quiz question is missing`);
        errors.push(`lesson ${lesson.id || '(unknown)'} quiz answers must be non-empty`);
      } else {
        if (!isNonEmptyString(lesson.quiz.question)) errors.push(`lesson ${lesson.id || '(unknown)'} quiz question is missing`);
        if (!Array.isArray(lesson.quiz.answers) || lesson.quiz.answers.length === 0) {
          errors.push(`lesson ${lesson.id || '(unknown)'} quiz answers must be non-empty`);
        } else {
          const answerIds = [];
          let correctCount = 0;
          for (const answer of lesson.quiz.answers) {
            if (!answer || typeof answer !== 'object' || !isSafeSlug(answer.id) || !isNonEmptyString(answer.text) || typeof answer.correct !== 'boolean') {
              errors.push(`lesson ${lesson.id || '(unknown)'} quiz answers must have safe IDs, text, and boolean correctness`);
              break;
            }
            answerIds.push(answer.id);
            if (answer.correct) correctCount += 1;
          }
          if (!hasUniqueValues(answerIds)) errors.push(`lesson ${lesson.id || '(unknown)'} quiz answer IDs must be unique`);
          if (correctCount === 0) errors.push(`lesson ${lesson.id || '(unknown)'} quiz must have a correct answer`);
        }
      }

      if (isNonEmptyString(lesson.id)) ids.push(lesson.id);
      if (isSafeSlug(lesson.slug)) slugs.push(lesson.slug);
    }

    if (!hasUniqueValues(ids)) {
      const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
      errors.push(`duplicate lesson id: ${duplicate}`);
    }
    if (!hasUniqueValues(slugs)) {
      const duplicate = slugs.find((slug, index) => slugs.indexOf(slug) !== index);
      errors.push(`duplicate lesson slug: ${duplicate}`);
    }
  }

  if (!Array.isArray(course.references)) {
    errors.push('references must be an array');
  } else {
    const slugs = [];
    for (const reference of course.references) {
      if (!reference || typeof reference !== 'object') {
        errors.push('reference must be an object');
        continue;
      }
      if (!isNonEmptyString(reference.title)) errors.push('reference title is missing');
      if (!isNonEmptyString(reference.slug)) errors.push(`reference ${reference.title || '(unknown)'} slug is missing`);
      else if (!isSafeSlug(reference.slug)) errors.push(`reference ${reference.title || '(unknown)'} slug must be URL-safe`);
      else if (reference.slug === 'source-map') errors.push('reference slug source-map is reserved');
      if (!isNonEmptyString(reference.body)) errors.push(`reference ${reference.title || '(unknown)'} body is missing`);
      if (isSafeSlug(reference.slug)) slugs.push(reference.slug);
    }
    if (!hasUniqueValues(slugs)) {
      const duplicate = slugs.find((slug, index) => slugs.indexOf(slug) !== index);
      errors.push(`duplicate reference slug: ${duplicate}`);
    }
  }

  if (!Array.isArray(course.sources)) {
    errors.push('sources must be an array');
  } else {
    const ids = [];
    for (const source of course.sources) {
      if (!source || typeof source !== 'object') {
        errors.push('source must be an object');
        continue;
      }
      if (!isNonEmptyString(source.id)) errors.push('source id is missing');
      else if (!isSafeSlug(source.id)) errors.push(`source ${source.title || '(unknown)'} id must be URL-safe`);
      if (!isNonEmptyString(source.title)) errors.push('source title is missing');
      const url = parseSafeSourceUrl(source.url);
      if (!url) errors.push(`source ${source.title || '(unknown)'} URL must use http or https`);
      else if (hasSensitiveSourceUrlData(url)) errors.push(`source ${source.title || '(unknown)'} URL must not contain credentials or sensitive query parameters`);
      if (!isNonEmptyString(source.accessedAt)) errors.push(`source ${source.title || '(unknown)'} accessed date is missing`);
      if (!isNonEmptyString(source.usedFor)) errors.push(`source ${source.title || '(unknown)'} usage mapping is missing`);
      if (isSafeSlug(source.id)) ids.push(source.id);
    }
    if (!hasUniqueValues(ids)) {
      const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
      errors.push(`duplicate source id: ${duplicate}`);
    }

    const knownIds = new Set(ids);
    for (const { lesson, sourceIds } of lessonSourceMappings) {
      for (const sourceId of sourceIds) {
        if (!isSafeSlug(sourceId)) {
          errors.push(`lesson ${lesson.id || '(unknown)'} source ID must be URL-safe`);
        } else if (!knownIds.has(sourceId)) {
          errors.push(`lesson ${lesson.id || '(unknown)'} references unknown source ID: ${sourceId}`);
        }
      }
    }
  }

  return errors.length === 0 ? { ok: true, value: course } : { ok: false, errors };
}
