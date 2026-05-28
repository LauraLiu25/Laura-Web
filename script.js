const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = [...document.querySelectorAll(".nav-link")];
const scrollContainer = document.querySelector(".scroll-container");
const matcherForm = document.querySelector("#matcherForm");
const jdInput = document.querySelector("#jdInput");
const matchSubmitBtn = document.querySelector("#matchSubmitBtn");
const MATCH_API_URL = window.MATCH_API_URL || "/api/match";
let matchModalBackdrop = null;
const skillTabs = [...document.querySelectorAll(".skill-tab")];
const skillCards = [...document.querySelectorAll("[data-card-panel]")];
const nextCardButton = document.querySelector(".next-card");
const skillPager = document.querySelector(".skill-pager");
const messageForm = document.querySelector("#messageForm");
const messageName = document.querySelector("#messageName");
const messageEmail = document.querySelector("#messageEmail");
const messageText = document.querySelector("#messageText");
const messageStatus = document.querySelector("#messageStatus");
const messageSendBtn = document.querySelector(".message-send");
const MESSAGE_API_URL = window.MESSAGE_API_URL || "/api/message";

const cardOrder = ["ai", "product", "language", "analysis"];
let activeCard = "ai";
let wechatToastLayer = null;
let wechatToastTimer = null;

function scrollToSection(target, behavior = "smooth") {
  if (!target || !scrollContainer) return;
  const top = target.offsetTop;
  if (typeof scrollContainer.scrollTo === "function") {
    scrollContainer.scrollTo({ top, behavior });
    return;
  }
  scrollContainer.scrollTop = top;
}

menuToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  menuToggle.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      event.preventDefault();
      scrollToSection(target);
      history.pushState(null, "", link.getAttribute("href"));
    }
    navLinks.forEach((item) => item.classList.toggle("active", item === link));
    navMenu.classList.remove("is-open");
    menuToggle?.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const sections = [...document.querySelectorAll(".page-section")];
const projectCards = [...document.querySelectorAll(".project-card[data-project]")];
let snapLock = false;
let touchStartY = null;
let projectModalBackdrop = null;

function getCurrentSectionIndex() {
  if (!scrollContainer || !sections.length) return 0;
  const scrollTop = scrollContainer.scrollTop;
  return sections.reduce((bestIndex, section, index) => {
    const bestDistance = Math.abs(sections[bestIndex].offsetTop - scrollTop);
    const distance = Math.abs(section.offsetTop - scrollTop);
    return distance < bestDistance ? index : bestIndex;
  }, 0);
}

function shouldUseNativeEducationScroll() {
  const currentSection = sections[getCurrentSectionIndex()];
  return currentSection?.id === "education" && currentSection.classList.contains("has-expanded-content");
}

function snapToAdjacentSection(direction) {
  if (!scrollContainer || snapLock || !direction) return;
  const currentIndex = getCurrentSectionIndex();
  const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;

  snapLock = true;
  scrollToSection(sections[nextIndex]);
  window.setTimeout(() => {
    snapLock = false;
  }, 720);
}

scrollContainer?.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaY) < 8) return;
  if (shouldUseNativeEducationScroll()) return;
  event.preventDefault();
  snapToAdjacentSection(event.deltaY > 0 ? 1 : -1);
}, { passive: false });

scrollContainer?.addEventListener("touchstart", (event) => {
  touchStartY = event.touches[0]?.clientY ?? null;
}, { passive: true });

scrollContainer?.addEventListener("touchend", (event) => {
  if (touchStartY === null) return;
  const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
  const delta = touchStartY - touchEndY;
  touchStartY = null;
  if (Math.abs(delta) < 42) return;
  if (shouldUseNativeEducationScroll()) return;
  snapToAdjacentSection(delta > 0 ? 1 : -1);
}, { passive: true });

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    const activeId = visible.target.id;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
    });
  },
  {
    root: scrollContainer,
    rootMargin: "-38% 0px -50% 0px",
    threshold: [0.1, 0.3, 0.6]
  }
);

sections.forEach((section) => observer.observe(section));

function ensureProjectModal() {
  if (projectModalBackdrop) return projectModalBackdrop;

  projectModalBackdrop = document.createElement("div");
  projectModalBackdrop.className = "project-modal-backdrop";
  projectModalBackdrop.innerHTML = `
    <div class="project-modal" role="dialog" aria-modal="true" aria-labelledby="projectModalTitle">
      <button class="project-modal-close" type="button" aria-label="关闭">×</button>
      <div class="project-modal-content"></div>
    </div>`;
  document.body.appendChild(projectModalBackdrop);

  projectModalBackdrop.addEventListener("click", (event) => {
    if (event.target === projectModalBackdrop || event.target.closest(".project-modal-close")) {
      closeProjectModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (matchModalBackdrop?.classList.contains("show")) {
      closeMatchModal();
      return;
    }
    if (projectModalBackdrop?.classList.contains("show")) {
      closeProjectModal();
    }
  });

  return projectModalBackdrop;
}

function openProjectModal(projectKey) {
  const template = document.getElementById(`project-detail-${projectKey}`);
  if (!template) return;

  const modal = ensureProjectModal();
  const content = modal.querySelector(".project-modal-content");
  const title = template.querySelector("h3");
  content.innerHTML = "";
  content.appendChild(template.cloneNode(true));
  if (title) {
    content.querySelector("h3")?.setAttribute("id", "projectModalTitle");
  }
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeProjectModal() {
  if (!projectModalBackdrop) return;
  projectModalBackdrop.classList.remove("show");
  document.body.style.overflow = "";
  projectModalBackdrop.querySelector(".project-modal-content").innerHTML = "";
}

projectCards.forEach((card) => {
  card.addEventListener("click", () => openProjectModal(card.dataset.project));
});

function syncNavFromHash() {
  const hash = window.location.hash || "#home";
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === hash);
  });
}

window.addEventListener("hashchange", syncNavFromHash);
syncNavFromHash();

if (window.location.hash) {
  window.addEventListener("load", () => {
    const target = document.querySelector(window.location.hash);
    if (target) scrollToSection(target, "auto");
  });
}

function ensureMatchModal() {
  if (matchModalBackdrop) return matchModalBackdrop;

  matchModalBackdrop = document.createElement("div");
  matchModalBackdrop.className = "match-modal-backdrop";
  matchModalBackdrop.innerHTML = `
    <div class="match-modal" role="dialog" aria-modal="true" aria-labelledby="matchModalTitle">
      <button class="match-modal-close" type="button" aria-label="关闭">×</button>
      <div class="match-modal-content" id="matchModalContent"></div>
    </div>`;
  document.body.appendChild(matchModalBackdrop);

  matchModalBackdrop.addEventListener("click", (event) => {
    if (event.target === matchModalBackdrop || event.target.closest(".match-modal-close")) {
      closeMatchModal();
    }
  });

  return matchModalBackdrop;
}

function closeMatchModal() {
  if (!matchModalBackdrop) return;
  matchModalBackdrop.classList.remove("show");
  document.body.style.overflow = "";
}

function renderMatchModal(data) {
  const modal = ensureMatchModal();
  const content = modal.querySelector("#matchModalContent");
  const analysisHtml = data.analysis
    .map(
      (item) => `
        <article class="match-analysis-item">
          <p class="match-analysis-item__text">${escapeHtml(item.text)}</p>
          <button class="match-analysis-item__btn" type="button" data-target="${escapeHtml(item.target)}">
            ${escapeHtml(item.buttonText)} <span aria-hidden="true">→</span>
          </button>
        </article>`
    )
    .join("");

  content.innerHTML = `
    <header class="match-modal-head">
      <div class="match-score" aria-label="匹配分数 ${data.score} 分">
        <span class="match-score__value">${data.score}</span>
        <span class="match-score__unit">分</span>
      </div>
      <div class="match-summary">
        <p class="match-modal-kicker">匹配分析 · For HR</p>
        <h2 id="matchModalTitle">岗位匹配结果</h2>
        <p class="match-summary__text">${escapeHtml(data.summary)}</p>
      </div>
    </header>
    <section class="match-analysis" aria-label="分项分析">
      ${analysisHtml}
    </section>`;

  content.querySelectorAll(".match-analysis-item__btn").forEach((button) => {
    button.addEventListener("click", () => {
      const targetSel = button.dataset.target;
      const target = document.querySelector(targetSel);
      closeMatchModal();
      if (target) {
        scrollToSection(target);
        history.pushState(null, "", targetSel);
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === targetSel);
        });
      }
    });
  });

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function renderMatchModalError(message) {
  const modal = ensureMatchModal();
  const content = modal.querySelector("#matchModalContent");
  content.innerHTML = `
    <header class="match-modal-head match-modal-head--error">
      <div class="match-summary">
        <p class="match-modal-kicker">匹配分析</p>
        <h2 id="matchModalTitle">暂时无法完成匹配</h2>
        <p class="match-summary__text">${escapeHtml(message)}</p>
      </div>
    </header>
    <section class="match-analysis">
      <article class="match-analysis-item">
        <p class="match-analysis-item__text">请确认已启动 ai-matcher 服务（<code>npm start</code>），并在 ai-matcher/.env 中配置 API 密钥。</p>
      </article>
    </section>`;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setMatchLoading(isLoading) {
  if (!matchSubmitBtn) return;
  matchSubmitBtn.disabled = isLoading;
  matchSubmitBtn.classList.toggle("is-loading", isLoading);
  matchSubmitBtn.textContent = isLoading ? "分析中…" : "立即匹配";
}

matcherForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const jd = jdInput.value.trim();
  if (jd.length < 20) {
    renderMatchModalError("请粘贴更完整的职位描述（建议不少于 20 字），以便生成可靠匹配分析。");
    return;
  }

  setMatchLoading(true);
  try {
    const response = await fetch(MATCH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jd }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "匹配服务请求失败");
    }
    renderMatchModal(payload);
  } catch (error) {
    renderMatchModalError(error.message || "网络异常，请稍后重试");
  } finally {
    setMatchLoading(false);
  }
});

messageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = messageName.value.trim();
  const email = messageEmail.value.trim();
  const text = messageText.value.trim();

  messageStatus.classList.remove("error");
  if (!text) {
    messageStatus.textContent = "请填写留言内容";
    messageStatus.classList.add("error");
    return;
  }

  if (email && (!email.includes("@") || !email.includes("."))) {
    messageStatus.textContent = "请输入有效的邮箱地址";
    messageStatus.classList.add("error");
    return;
  }

  if (messageSendBtn) {
    messageSendBtn.disabled = true;
  }
  messageStatus.textContent = "发送中…";

  try {
    const response = await fetch(MESSAGE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "留言发送失败");
    }

    messageForm.reset();
    messageStatus.textContent = "";
    showWechatToast(payload.wechatId);
  } catch (error) {
    messageStatus.textContent = error.message || "留言发送失败，请稍后重试";
    messageStatus.classList.add("error");
  } finally {
    if (messageSendBtn) {
      messageSendBtn.disabled = false;
    }
  }
});

function hideWechatToast() {
  if (wechatToastTimer) {
    window.clearTimeout(wechatToastTimer);
    wechatToastTimer = null;
  }
  if (!wechatToastLayer) return;
  wechatToastLayer.classList.add("is-hiding");
  window.setTimeout(() => {
    wechatToastLayer?.remove();
    wechatToastLayer = null;
  }, 380);
}

function showWechatToast(wechatId) {
  hideWechatToast();

  const id = String(wechatId || "").trim();
  wechatToastLayer = document.createElement("div");
  wechatToastLayer.className = "wechat-toast-layer";
  wechatToastLayer.setAttribute("role", "dialog");
  wechatToastLayer.setAttribute("aria-live", "polite");
  wechatToastLayer.innerHTML = `
    <div class="wechat-toast">
      <p class="wechat-toast__title">留言已发送</p>
      <p class="wechat-toast__desc">感谢你的留言，我会尽快查看邮箱回复。如需更快联系，欢迎添加我的微信。</p>
      ${
        id
          ? `<div class="wechat-toast__row">
              <span class="wechat-toast__id">${escapeHtml(id)}</span>
              <button class="wechat-toast__copy" type="button">复制微信号</button>
            </div>`
          : ""
      }
    </div>`;

  document.body.appendChild(wechatToastLayer);
  requestAnimationFrame(() => {
    wechatToastLayer?.classList.add("show");
  });

  const copyBtn = wechatToastLayer.querySelector(".wechat-toast__copy");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(id);
      copyBtn.textContent = "✅ 已复制";
      copyBtn.classList.add("is-copied");
    } catch {
      copyBtn.textContent = "请手动复制";
    }
  });

  wechatToastLayer.addEventListener("click", (event) => {
    if (event.target === wechatToastLayer) {
      hideWechatToast();
    }
  });

  wechatToastTimer = window.setTimeout(hideWechatToast, 5000);
}

function getNextCardKey(cardKey) {
  const nextIndex = (cardOrder.indexOf(cardKey) + 1) % cardOrder.length;
  return cardOrder[nextIndex];
}

function switchCard(cardKey) {
  if (!cardOrder.includes(cardKey)) return;
  activeCard = cardKey;

  skillTabs.forEach((tab) => {
    const active = tab.dataset.card === cardKey;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  skillCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.cardPanel === cardKey);
  });

  if (skillPager) {
    const index = cardOrder.indexOf(cardKey) + 1;
    skillPager.textContent = `${index} / ${cardOrder.length}`;
  }

}

skillTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchCard(tab.dataset.card));
});

nextCardButton?.addEventListener("click", () => {
  switchCard(getNextCardKey(activeCard));
});

const awardData = {
  national: {
    title: "国家级荣誉",
    items: [
      "2021-2022学年国家励志奖学金",
      "2020-2021学年国家励志奖学金",
      "2019-2020学年国家励志奖学金"
    ]
  },
  province: {
    title: "省级荣誉",
    items: ["2023年6月 黑龙江省普通高等学校“优秀毕业生”荣誉称号"]
  },
  school: {
    title: "校级荣誉",
    items: [
      "2023年 哈尔滨理工大学“心系祖国需要、志愿服务基层”优秀毕业生荣誉称号",
      "哈尔滨理工大学2022-2023学年第一学期学生奖学金",
      "哈尔滨理工大学2021-2022学年“三好学生”荣誉称号",
      "哈尔滨理工大学2021-2022学年第一学期学生奖学金",
      "哈尔滨理工大学2021-2022学年第二学期学生奖学金",
      "哈尔滨理工大学2020-2021学年第一学期学生奖学金",
      "哈尔滨理工大学2020-2021学年第二学期学生奖学金",
      "哈尔滨理工大学2020-2021学年“优秀团员”荣誉称号",
      "哈尔滨理工大学2019-2020学年第一学期学生奖学金",
      "哈尔滨理工大学2019-2020学年第二学期学生奖学金",
      "哈尔滨理工大学2019-2020学年“优秀学生干部”荣誉称号"
    ]
  },
  competitionNational: {
    title: "国家级竞赛奖项",
    items: ["国家级项目优秀结题｜黑龙江省大学生创新创业训练计划项目｜2022年8月"]
  },
  competitionProvince: {
    title: "省级竞赛奖项",
    items: [
      "省级铜奖｜“建行杯”第八届黑龙江省“互联网+”大学生创新创业大赛｜2022年8月",
      "省级铜奖｜第三届工商银行“挑战杯”黑龙江省大学生创业计划竞赛｜2022年8月",
      "山东省一等奖｜第十七届全国大学生数智化企业经营沙盘大赛｜2021年6月",
      "山东省三等奖｜全国高等院校财务数智化大赛财务大数据赛项｜2020年11月",
      "山东省一等奖｜第十六届全国大学生“新道杯”沙盘模拟经营大赛｜2020年10月",
      "山东省本科组一等奖｜第十二届山东省大学生科技节——模拟企业经营大赛｜2020年10月",
      "山东省二等奖｜第三届“新道数智人才杯”全国高等院校数智人力大赛｜2020年6月"
    ]
  }
};

function updateTimelineLine(item) {
  const rail = item.querySelector(".timeline-rail");
  const card = item.querySelector(".edu-card");
  const detail = item.querySelector(".edu-detail");
  if (!rail || !card) return;
  const detailHeight = item.classList.contains("is-open") && detail ? detail.scrollHeight + 16 : 0;
  rail.style.setProperty("--line-height", `${Math.max(130, card.offsetHeight + detailHeight - 6)}px`);
}

function syncEducationTimelineAxis() {
  const timeline = document.querySelector("#education .timeline");
  if (!timeline) return;

  const rails = [...timeline.querySelectorAll(".timeline-rail")];
  if (!rails.length) return;

  const timelineRect = timeline.getBoundingClientRect();
  const railRect = rails[0].getBoundingClientRect();
  const dot = rails[0].querySelector(".timeline-dot");
  if (!dot) return;

  const dotRect = dot.getBoundingClientRect();
  const dotCenterX = dotRect.left + dotRect.width / 2;
  const timelineAxisX = dotCenterX - timelineRect.left;
  const railAxisX = dotCenterX - railRect.left;

  timeline.style.setProperty("--edu-rail-dot-x", `${timelineAxisX}px`);
  rails.forEach((rail) => {
    rail.style.setProperty("--edu-rail-dot-x", `${railAxisX}px`);
  });
}

function updateAllTimelineLines() {
  document.querySelectorAll(".timeline-item").forEach(updateTimelineLine);
  syncEducationTimelineAxis();
}

function syncEducationScrollMode(section) {
  const isExpanded = Boolean(section?.querySelector(".timeline-item.is-open"));
  section?.classList.toggle("has-expanded-content", isExpanded);
  scrollContainer?.classList.toggle("free-scroll", isExpanded);
}

document.querySelectorAll(".timeline-item").forEach((item) => {
  updateTimelineLine(item);
  item.querySelector(".expand-btn")?.addEventListener("click", () => {
    const isOpen = item.classList.toggle("is-open");
    item.querySelector(".expand-btn")?.setAttribute("aria-expanded", String(isOpen));
    syncEducationScrollMode(item.closest(".page-section"));
    window.setTimeout(() => updateAllTimelineLines(), 30);
    window.setTimeout(() => updateAllTimelineLines(), 380);
  });
});

window.addEventListener("resize", updateAllTimelineLines);
window.addEventListener("load", updateAllTimelineLines);

if (document.fonts?.ready) {
  document.fonts.ready.then(updateAllTimelineLines);
}

function ensureModal() {
  let backdrop = document.querySelector(".modal-backdrop");
  if (backdrop) return backdrop;
  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="award-modal" role="dialog" aria-modal="true">
    <button class="modal-close" type="button" aria-label="关闭">×</button>
    <h3></h3>
    <ul></ul>
  </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop || event.target.closest(".modal-close")) backdrop.classList.remove("show");
  });
  return backdrop;
}

document.querySelectorAll("[data-award]").forEach((button) => {
  button.addEventListener("click", () => {
    const data = awardData[button.dataset.award];
    if (!data) return;
    const modal = ensureModal();
    modal.querySelector("h3").textContent = data.title;
    modal.querySelector("ul").innerHTML = data.items.map((item) => `<li>${item}</li>`).join("");
    modal.classList.add("show");
  });
});

function ensureLightbox() {
  let backdrop = document.querySelector(".lightbox-backdrop");
  if (backdrop) return backdrop;
  backdrop = document.createElement("div");
  backdrop.className = "lightbox-backdrop";
  backdrop.innerHTML = "<img alt='放大图片'>";
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", () => backdrop.classList.remove("show"));
  return backdrop;
}

document.querySelectorAll("[data-lightbox]").forEach((image) => {
  image.addEventListener("click", () => {
    const lightbox = ensureLightbox();
    lightbox.querySelector("img").src = image.src;
    lightbox.classList.add("show");
  });
});

const achievementCards = [...document.querySelectorAll(".achievement-card")];
const achievementDots = document.querySelector(".carousel-dots");
let achievementIndex = 0;

function renderAchievements() {
  if (!achievementCards.length) return;
  achievementCards.forEach((card, index) => {
    const offset = (index - achievementIndex + achievementCards.length) % achievementCards.length;
    const positions = [
      { x: 0, scale: 1, opacity: 1, z: 5 },
      { x: 52, scale: 0.92, opacity: 0.82, z: 4 },
      { x: 96, scale: 0.84, opacity: 0.62, z: 3 },
      { x: -48, scale: 0.86, opacity: 0.48, z: 2 }
    ];
    const pos = positions[offset];
    card.style.transform = `translateX(${pos.x}px) scale(${pos.scale})`;
    card.style.opacity = pos.opacity;
    card.style.zIndex = pos.z;
    card.classList.toggle("active", index === achievementIndex);
  });
  achievementDots?.querySelectorAll("button").forEach((dot, index) => {
    dot.classList.toggle("active", index === achievementIndex);
  });
}

if (achievementDots && achievementCards.length) {
  achievementCards.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `切换到第${index + 1}张成就卡片`);
    dot.addEventListener("click", () => {
      achievementIndex = index;
      renderAchievements();
    });
    achievementDots.appendChild(dot);
  });
  document.querySelector(".carousel-arrow.prev")?.addEventListener("click", () => {
    achievementIndex = (achievementIndex - 1 + achievementCards.length) % achievementCards.length;
    renderAchievements();
  });
  document.querySelector(".carousel-arrow.next")?.addEventListener("click", () => {
    achievementIndex = (achievementIndex + 1) % achievementCards.length;
    renderAchievements();
  });
  let startX = 0;
  document.querySelector(".achievement-carousel")?.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
  });
  document.querySelector(".achievement-carousel")?.addEventListener("pointerup", (event) => {
    const delta = event.clientX - startX;
    if (Math.abs(delta) < 32) return;
    achievementIndex = delta < 0
      ? (achievementIndex + 1) % achievementCards.length
      : (achievementIndex - 1 + achievementCards.length) % achievementCards.length;
    renderAchievements();
  });
  renderAchievements();
}

