import { useParams, Navigate } from "react-router-dom";

const content: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "[Placeholder — replace with your actual policy] Bueno Exports (\"we\", \"us\") collects personal information you provide during checkout and account creation, including your name, email, phone number, and delivery address.",
      "We use this information solely to process orders, provide customer support, and improve our services. We do not sell your personal information to third parties.",
      "Payment information is processed securely by our payment partners and is never stored on our servers.",
      "You may request access to, correction of, or deletion of your personal data by contacting us at the email address listed on our Contact page.",
      "This policy may be updated periodically; continued use of the site after changes constitutes acceptance of the revised policy.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "[Placeholder — replace with your actual terms] By using this website and placing an order, you agree to these Terms of Service.",
      "All product descriptions, prices, and availability are subject to change without notice. We reserve the right to refuse or cancel any order at our discretion.",
      "Prices are listed in Indian Rupees (₹) and are inclusive/exclusive of applicable taxes as shown at checkout.",
      "You are responsible for providing accurate delivery information; we are not liable for delays or non-delivery caused by incorrect details.",
      "All content on this site (text, images, logos) is the property of Bueno Exports and may not be reproduced without permission.",
    ],
  },
  returns: {
    title: "Return & Refund Policy",
    body: [
      "[Placeholder — replace with your actual policy] We want you to be satisfied with your purchase. If a product arrives damaged, defective, or incorrect, please contact us within 48 hours of delivery with photos of the issue.",
      "Approved returns must be shipped back in their original, unopened packaging. Due to the perishable nature of spices, we cannot accept returns of opened products unless defective.",
      "Refunds are processed to the original payment method within 7–10 business days of receiving and inspecting the returned item.",
      "Shipping charges are non-refundable unless the return is due to our error.",
      "For questions about a specific order, please reach out via our Contact page with your order number.",
    ],
  },
};

const Legal = () => {
  const { page } = useParams();
  const data = page ? content[page] : null;
  if (!data) return <Navigate to="/" replace />;

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{data.title}</h1>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          {data.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
};

export default Legal;
