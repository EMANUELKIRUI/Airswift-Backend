const emailLayout = (content, title = 'Talex') => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- HEADER -->
        <div style="background:#0d6efd;padding:20px;text-align:center;">
          <img
            src="https://res.cloudinary.com/dlncyruta/image/upload/v1712345678/talex/logos/logo.png"
            alt="Talex Logo"
            style="height:50px;"
          />
        </div>

        <!-- BODY -->
        <div style="padding:30px;color:#333;">
          <h2 style="margin-top:0;color:#2c3e50;">${title}</h2>
          ${content}
        </div>

        <!-- FOOTER -->
        <div style="background:#f1f1f1;padding:15px;text-align:center;font-size:12px;color:#777;">
          © ${new Date().getFullYear()} Talex. All rights reserved.
        </div>
      </div>
    </div>
  `;
};

module.exports = { emailLayout };