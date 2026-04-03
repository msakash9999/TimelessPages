(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var menus = document.querySelectorAll('.books-menu');

    menus.forEach(function (menu) {
      var link = menu.querySelector('.books-link');
      if (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          menu.classList.toggle('is-open');
        });
      }
    });

    // close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.books-menu')) {
        document.querySelectorAll('.books-menu.is-open').forEach(function (m) {
          m.classList.remove('is-open');
        });
      }
    });
  });
})();
