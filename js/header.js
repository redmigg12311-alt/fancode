const toggleBtn = document.querySelector('.menu-toggle');
const navbar = document.querySelector('.navbar');

toggleBtn.addEventListener('click', () => {
  navbar.classList.toggle('show');
});
